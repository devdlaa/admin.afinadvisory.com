import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { UpdateRolePermissionsSchema } from "@/app/schemas/UserSchema/UserSchema";
import { auth } from "@/utils/auth";
import permissionsList from "@/config/permissions.json";
import { requirePermission } from "@/lib/requirePermission";

// Standardized response helpers
const createSuccessResponse = (message, data = null, status = 200) => {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
};

const createErrorResponse = (message, errors = null, status = 400) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Only include errors array if provided
  if (errors) {
    response.errors = Array.isArray(errors) ? errors : [errors];
  }

  return NextResponse.json(response, { status });
};

// Validate permissions against allowed list
function validatePermissions(permissions) {
  if (!permissions || !Array.isArray(permissions)) {
    return [];
  }

  // Empty array is valid (removes all permissions)
  if (permissions.length === 0) {
    return [];
  }

  // Check if permissions config is loaded
  if (!permissionsList?.availablePermissions) {
    throw new Error("Permissions configuration not available");
  }

  const validPermissionIds = permissionsList.availablePermissions.map((p) => p.id);
  const invalidPermissions = permissions.filter((p) => !validPermissionIds.includes(p));

  if (invalidPermissions.length > 0) {
    throw new Error(`Invalid permissions: ${invalidPermissions.join(", ")}`);
  }

  // Remove duplicates and return unique permissions
  return [...new Set(permissions)];
}

// Get permission details for response
function getPermissionDetails(permissionIds) {
  if (!permissionIds || permissionIds.length === 0) return [];

  return permissionIds.map((id) => {
    const permission = permissionsList.availablePermissions.find((p) => p.id === id);
    return permission
      ? {
          id: permission.id,
          label: permission.label,
          category: permission.category,
        }
      : { id, label: "Unknown", category: "Unknown" };
  });
}

// Business logic validation for role/permission updates
function validateRolePermissionUpdate(currentUser, targetUser, newRole, newPermissions) {
  // Prevent downgrading super admin unless done by another super admin
  if (
    targetUser.role === "superAdmin" &&
    newRole &&
    newRole !== "superAdmin" &&
    currentUser?.role !== "superAdmin"
  ) {
    throw new Error("Only super admins can modify super admin roles");
  }

  // Prevent self-role modification to lower level
  if (
    currentUser?.id === targetUser.id &&
    newRole &&
    (targetUser.role === "superAdmin" && newRole !== "superAdmin") ||
    (targetUser.role === "admin" && newRole === "user")
  ) {
    throw new Error("Cannot downgrade your own role");
  }

  // Validate super admin permissions (they should have all permissions)
  if (newRole === "superAdmin" && newPermissions && newPermissions.length === 0) {
    throw new Error("Super admins must have at least basic permissions");
  }

  return true;
}



export async function PATCH(req) {
  try {
    const session = await auth();
    // TODO: Add permission check
    const permissionCheck = await requirePermission(req, ["users.access", "users.alter-permissions"]);
    if (permissionCheck) return permissionCheck;

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "Invalid request format",
        [{ field: "body", message: "Request body must be valid JSON" }],
        400
      );
    }

    // Validate input using Zod schema
    let validatedData;
    try {
      validatedData = UpdateRolePermissionsSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const formattedErrors = validationError.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
          receivedValue: error.input,
        }));
        return createErrorResponse("Validation failed", formattedErrors, 400);
      }

      return createErrorResponse(
        "Data validation failed",
        [{ field: "validation", message: validationError.message }],
        400
      );
    }

    // Validate permissions if provided
    let validatedPermissions = validatedData.permissions;
    if (validatedData.permissions !== undefined) {
      try {
        validatedPermissions = validatePermissions(validatedData.permissions);
      } catch (permissionError) {
        return createErrorResponse(
          "Invalid permissions",
          [{ field: "permissions", message: permissionError.message }],
          400
        );
      }
    }

    const db = admin.firestore();
    const { userId } = validatedData;

    // Check if user exists
    const userRef = db.collection("admin_users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return createErrorResponse(
        "User not found",
        [{ field: "userId", message: "The specified user does not exist" }],
        404
      );
    }

    const currentUserData = userSnap.data();

    // Business logic validation
    try {
      validateRolePermissionUpdate(
       session?.user,
        { id: userId, role: currentUserData.role },
        validatedData.role,
        validatedPermissions
      );
    } catch (validationError) {
      return createErrorResponse(
        "Update not allowed",
        [{ field: "authorization", message: validationError.message }],
        403
      );
    }

    // Prepare update payload
    const updatePayload = {
      updatedAt: new Date().toISOString(),
    };

    const changes = {};

    // Add role if provided
    if (validatedData.role !== undefined) {
      updatePayload.role = validatedData.role;
      changes.role = {
        from: currentUserData.role || "user",
        to: validatedData.role,
      };
    }

    // Add permissions if provided
    if (validatedData.permissions !== undefined) {
      updatePayload.permissions = validatedPermissions;
      const currentPermissions = currentUserData.permissions || [];
      
      changes.permissions = {
        from: currentPermissions,
        to: validatedPermissions,
        summary: {
          total: validatedPermissions.length,
          added: validatedPermissions.filter((p) => !currentPermissions.includes(p)),
          removed: currentPermissions.filter((p) => !validatedPermissions.includes(p)),
        },
      };
    }

    // Perform the update
    await userRef.update(updatePayload);

   

    // Prepare response data
    const responseData = {
      userId,
      userInfo: {
        name: currentUserData.name,
        email: currentUserData.email,
        userCode: currentUserData.userCode,
      },
      updatedFields: Object.keys(changes),
      changes: {
        ...changes,
        // Add detailed permission information for better client-side handling
        ...(changes.permissions && {
          permissions: {
            ...changes.permissions,
            fromDetails: getPermissionDetails(changes.permissions.from),
            toDetails: getPermissionDetails(changes.permissions.to),
          },
        }),
      },
      timestamp: updatePayload.updatedAt,
    };

    // Dynamic success message
    const updatedFields = responseData.updatedFields;
    let message = "User updated successfully";
    
    if (updatedFields.includes("role") && updatedFields.includes("permissions")) {
      message = "User role and permissions updated successfully";
    } else if (updatedFields.includes("role")) {
      message = `User role updated to ${validatedData.role}`;
    } else if (updatedFields.includes("permissions")) {
      const permCount = validatedPermissions.length;
      message = `User permissions updated (${permCount} permission${permCount !== 1 ? 's' : ''} assigned)`;
    }

    return createSuccessResponse(message, responseData, 200);

  } catch (error) {
    // Log error for monitoring
    console.error("Update role/permissions operation failed:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle specific Firebase errors
    if (error.code === "permission-denied") {
      return createErrorResponse(
        "Access denied",
        [{ field: "permissions", message: "Insufficient permissions to update user roles or permissions" }],
        403
      );
    }

    if (error.code === "unavailable") {
      return createErrorResponse(
        "Service temporarily unavailable",
        [{ field: "server", message: "Database service is currently unavailable. Please try again later." }],
        503
      );
    }

    if (error.code === "deadline-exceeded") {
      return createErrorResponse(
        "Request timeout",
        [{ field: "server", message: "Operation took too long to complete. Please try again." }],
        408
      );
    }

    // Generic server error
    const errorMessage = process.env.NODE_ENV === "development" 
      ? error.message || "Internal server error"
      : "An unexpected error occurred. Please try again later.";

    return createErrorResponse(
      "Internal server error",
      [{ field: "server", message: errorMessage }],
      500
    );
  }
}
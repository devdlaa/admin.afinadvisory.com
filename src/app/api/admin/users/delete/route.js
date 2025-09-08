import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { DeleteUserSchema } from "@/app/schemas/UserSchema/UserSchema";
import { auth } from "@/utils/auth";
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

// Business logic validation
function validateUserDeletion(userData, currentUserId = null) {
  // Prevent deletion of active super admins
  if (userData.role === "superAdmin" && userData.status === "active") {
    throw new Error(
      "Cannot delete active super admin users for security reasons"
    );
  }

  // Prevent self-deletion (if currentUserId is available from session)
  if (currentUserId && userData.userId === currentUserId) {
    throw new Error("Cannot delete your own account");
  }

  // Check if user has critical dependencies (customize based on your business logic)
  if (userData.hasCriticalDependencies) {
    throw new Error("User cannot be deleted due to existing dependencies");
  }

  return true;
}

// Archive user data before deletion
async function archiveUserData(db, userId, userData) {
  try {
    const archiveRef = db.collection("deleted_users").doc(userId);
    const archiveData = {
      ...userData,
      deletedAt: new Date().toISOString(),
      originalId: userId,
    };

    // Remove sensitive fields from archive if needed
    delete archiveData.password;
    delete archiveData.resetTokens;

    await archiveRef.set(archiveData);
    return true;
  } catch (archiveError) {
    console.error("Failed to archive user data:", {
      userId,
      error: archiveError.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

// Delete user from Firebase Auth
async function deleteFromAuth(userId) {
  try {
    // Check if user exists in Firebase Auth first
    const userRecord = await admin
      .auth()
      .getUser(userId)
      .catch(() => null);

    if (userRecord) {
      await admin.auth().deleteUser(userId);
      return true;
    }
    return false;
  } catch (authError) {
    console.error("Failed to delete user from Firebase Auth:", {
      userId,
      error: authError.message,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

export async function DELETE(req) {
  try {
    const session = await auth();

    // TODO: Add permission check
    const permissionCheck = await requirePermission(req, "users.delete");
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
      validatedData = DeleteUserSchema.parse(body);
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

    const userData = userSnap.data();

    try {
      validateUserDeletion(userData, session?.user?.id);
    } catch (validationError) {
      return createErrorResponse(
        "User deletion not allowed",
        [{ field: "user", message: validationError.message }],
        403
      );
    }

    // Prepare user info for response (before deletion)
    const deletedUserInfo = {
      userId,
      userCode: userData.userCode,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      createdAt: userData.createdAt,
      deletedAt: new Date().toISOString(),
    };

    // Archive user data
    const archived = await archiveUserData(db, userId, userData);

    // Delete from Firestore
    await userRef.delete();

    // Delete from Firebase Auth
    const authDeleted = await deleteFromAuth(userId);

    // Success response with operation details
    return createSuccessResponse(
      "User deleted successfully",
      {
        deletedUser: deletedUserInfo,
        operations: {
          firestoreDeleted: true,
          authDeleted,
          archived,
        },
      },
      200
    );
  } catch (error) {
    // Log error for monitoring
    console.error("Delete user operation failed:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle specific Firebase errors
    if (error.code === "permission-denied") {
      return createErrorResponse(
        "Access denied",
        [
          {
            field: "permissions",
            message: "Insufficient permissions to perform this operation",
          },
        ],
        403
      );
    }

    if (error.code === "unavailable") {
      return createErrorResponse(
        "Service temporarily unavailable",
        [
          {
            field: "server",
            message:
              "Database service is currently unavailable. Please try again later.",
          },
        ],
        503
      );
    }

    if (error.code === "deadline-exceeded") {
      return createErrorResponse(
        "Request timeout",
        [
          {
            field: "server",
            message: "Operation took too long to complete. Please try again.",
          },
        ],
        408
      );
    }

    // Generic server error
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error.message || "Internal server error"
        : "An unexpected error occurred. Please try again later.";

    return createErrorResponse(
      "Internal server error",
      [{ field: "server", message: errorMessage }],
      500
    );
  }
}

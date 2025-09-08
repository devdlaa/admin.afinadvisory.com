import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { SEND_EMAIL } from "@/utils/sendemail";
import { CreateUserSchema } from "@/app/schemas/UserSchema/UserSchema";
import permissionsList from "@/config/permissions.json";
import jwt from "jsonwebtoken";
import { requirePermission } from "@/lib/requirePermission";
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_WEB_URL || "https://admin.afinadvisory.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "info@afinadvisory.com";

// 🆕 IMPROVED RESPONSE HELPERS
const createSuccessResponse = (message, data = {}, status = 201) => {
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

const createErrorResponse = (errors, status = 400, message = null) => {
  // Ensure errors is always an array
  const errorArray = Array.isArray(errors) ? errors : [errors];
  
  // Standardize error format for UI consistency
  const formattedErrors = errorArray.map(error => ({
    field: error.field || 'unknown',
    message: error.message || 'An error occurred',
    code: error.code || 'VALIDATION_ERROR',
    receivedValue: error.receivedValue || undefined
  }));

  return NextResponse.json(
    {
      success: false,
      message: message || 'Request validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
};

// Generate next user code with better error handling
async function getNextUserCode() {
  const db = admin.firestore();
  const counterRef = db.collection("admin_user_counter").doc("counter");

  try {
    const nextCounter = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      const current = doc.exists ? (doc.data()?.current || 0) : 0;
      const updated = current + 1;
      transaction.set(counterRef, { current: updated }, { merge: true });
      return updated;
    });

    return `ADMIN_USER_${String(nextCounter).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating user code:", error);
    // Fallback with timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `ADMIN_USER_${timestamp}`;
  }
}

// 🆕 ENHANCED PERMISSIONS VALIDATION
function validatePermissions(permissions) {
  if (!permissions) return true; // undefined/null is valid (optional field)
  
  if (!Array.isArray(permissions)) {
    throw new Error("Permissions must be an array");
  }

  if (permissions.length === 0) return true; // empty array is valid

  // Check if permissionsList exists and has availablePermissions
  if (!permissionsList?.availablePermissions) {
    console.error("Permissions configuration not found");
    throw new Error("Server configuration error: permissions not available");
  }

  const validPermissionIds = permissionsList.availablePermissions.map((p) => p.id);
  const invalidPermissions = permissions.filter(
    (p) => !validPermissionIds.includes(p)
  );

  if (invalidPermissions.length > 0) {
    throw new Error(`Invalid permissions: ${invalidPermissions.join(", ")}`);
  }

  return true;
}

// Send invitation email with better error handling
async function sendInvitationEmail(userData, inviteToken) {
  try {
    // Validate required data
    if (!userData?.email || !userData?.name || !inviteToken) {
      throw new Error("Missing required data for sending invitation");
    }

    const inviteLink = `${FRONTEND_URL}/user-onboarding?token=${inviteToken}`;

    const emailResult = await SEND_EMAIL({
      to: userData.email,
      type: "SEND_USER_INVITE_LINK",
      variables: {
        recipientName: userData.name,
        inviterName: "Admin User",
        inviteLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    });

    if (!emailResult?.success) {
      throw new Error(emailResult?.error || "Email service returned unsuccessful response");
    }

    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send invitation email",
    };
  }
}

export async function POST(req) {
  try {

     const permissionCheck = await requirePermission(
          req,
          "users.invite"
        );
        if (permissionCheck) return permissionCheck;
    // 🆕 ENHANCED ENVIRONMENT VALIDATION
    if (!JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      return createErrorResponse(
        [{
          field: "server",
          message: "Server configuration error",
          code: "MISSING_JWT_SECRET"
        }],
        500,
        "Server configuration error"
      );
    }

    // 🆕 IMPROVED REQUEST BODY PARSING
    let body;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        return createErrorResponse(
          [{
            field: "body",
            message: "Request body is empty",
            code: "EMPTY_BODY"
          }],
          400,
          "Empty request body"
        );
      }
      
      body = JSON.parse(rawBody);
      
      // Check if body is null or not an object
      if (!body || typeof body !== 'object') {
        return createErrorResponse(
          [{
            field: "body",
            message: "Request body must be a valid JSON object",
            code: "INVALID_JSON_OBJECT"
          }],
          400,
          "Invalid request body format"
        );
      }

    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return createErrorResponse(
        [{
          field: "body",
          message: "Invalid JSON format in request body",
          code: "JSON_PARSE_ERROR"
        }],
        400,
        "Invalid JSON in request body"
      );
    }

    // 🆕 ENHANCED INPUT VALIDATION
    let validatedData;
    try {
      // Pre-validation checks
      if (!body.name?.trim()) {
        return createErrorResponse(
          [{
            field: "name",
            message: "Name is required",
            code: "MISSING_REQUIRED_FIELD"
          }],
          400,
          "Missing required field: name"
        );
      }

      if (!body.email?.trim()) {
        return createErrorResponse(
          [{
            field: "email",
            message: "Email is required",
            code: "MISSING_REQUIRED_FIELD"
          }],
          400,
          "Missing required field: email"
        );
      }

      validatedData = CreateUserSchema.parse(body);
      validatePermissions(validatedData.permissions);

    } catch (validationError) {
      console.error("Validation error:", validationError);
      
      if (validationError instanceof ZodError) {
        const formattedErrors = validationError.errors.map((error) => ({
          field: error.path.join(".") || "unknown",
          message: error.message,
          code: "VALIDATION_ERROR",
          receivedValue: error.received
        }));
        
        return createErrorResponse(
          formattedErrors, 
          400,
          "Input validation failed"
        );
      }

      // Handle permission validation errors
      return createErrorResponse(
        [{
          field: "permissions",
          message: validationError.message,
          code: "PERMISSION_VALIDATION_ERROR"
        }],
        400,
        "Permission validation failed"
      );
    }

    // 🆕 DATABASE OPERATIONS WITH BETTER ERROR HANDLING
    let db, usersRef;
    try {
      db = admin.firestore();
      usersRef = db.collection("admin_users");
    } catch (dbError) {
      console.error("Database initialization error:", dbError);
      return createErrorResponse(
        [{
          field: "database",
          message: "Database connection failed",
          code: "DB_CONNECTION_ERROR"
        }],
        503,
        "Database service unavailable"
      );
    }

    // Check for existing email with error handling
    try {
      const emailQuery = await usersRef
        .where("email", "==", validatedData.email)
        .limit(1)
        .get();
        
      if (!emailQuery.empty) {
        return createErrorResponse(
          [{
            field: "email",
            message: "A user with this email already exists",
            code: "DUPLICATE_EMAIL"
          }],
          409,
          "Email already exists"
        );
      }
    } catch (queryError) {
      console.error("Email query error:", queryError);
      return createErrorResponse(
        [{
          field: "database",
          message: "Failed to check existing email",
          code: "DB_QUERY_ERROR"
        }],
        503,
        "Database query failed"
      );
    }

    // Check for existing phone with error handling
    try {
      const phoneQuery = await usersRef
        .where("phone", "==", validatedData.phone)
        .limit(1)
        .get();
        
      if (!phoneQuery.empty) {
        return createErrorResponse(
          [{
            field: "phone",
            message: "A user with this phone number already exists",
            code: "DUPLICATE_PHONE"
          }],
          409,
          "Phone number already exists"
        );
      }
    } catch (queryError) {
      console.error("Phone query error:", queryError);
      return createErrorResponse(
        [{
          field: "database",
          message: "Failed to check existing phone number",
          code: "DB_QUERY_ERROR"
        }],
        503,
        "Database query failed"
      );
    }

    // Generate user code and tokens
    const userCode = await getNextUserCode();
    const now = new Date().toISOString();

    let inviteToken;
    try {
      inviteToken = jwt.sign(
        {
          email: validatedData.email,
          phone: validatedData.phone,
          name: validatedData.name,
          userCode,
          purpose: "user_invitation",
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
    } catch (tokenError) {
      console.error("Token generation error:", tokenError);
      return createErrorResponse(
        [{
          field: "server",
          message: "Failed to generate invitation token",
          code: "TOKEN_GENERATION_ERROR"
        }],
        500,
        "Token generation failed"
      );
    }

    const inviteExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    // Prepare user data
    const newUser = {
      ...validatedData,
      userCode,
      status: "pending",
      twoFactorEnabled: false,
      inviteToken,
      inviteExpiresAt,
      invitedBy: "Admin User",
      isInvitationLinkResent: false,
      lastInvitationSentAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Save user to database
    let userDocRef;
    try {
      userDocRef = usersRef.doc();
      await userDocRef.set(newUser);
    } catch (saveError) {
      console.error("User save error:", saveError);
      return createErrorResponse(
        [{
          field: "database",
          message: "Failed to save user data",
          code: "DB_SAVE_ERROR"
        }],
        500,
        "Failed to create user"
      );
    }

    // Send invitation email
    const emailResult = await sendInvitationEmail(validatedData, inviteToken);

    // 🆕 COMPREHENSIVE RESPONSE PREPARATION
    const responseData = {
      userId: userDocRef.id,
      userCode,
      email: validatedData.email,
      name: validatedData.name,
      status: "pending",
      emailSent: emailResult.success,
    };

    if (!emailResult.success) {
      responseData.warning = "User created but invitation email could not be sent";
      responseData.emailError = emailResult.error;
      responseData.inviteToken = inviteToken; // Provide token for manual sending
      
      console.warn(
        `User ${userDocRef.id} created but email failed:`,
        emailResult.error
      );
    }

    const message = emailResult.success
      ? "User created successfully and invitation email sent"
      : "User created but invitation email failed to send";

    const status = emailResult.success ? 201 : 206; // 206 = Partial Content

    return createSuccessResponse(message, responseData, status);

  } catch (error) {
    console.error("Unexpected error in POST /api/admin/users/create:", error);

    // 🆕 SPECIFIC ERROR TYPE HANDLING
    if (error.name === "TypeError") {
      return createErrorResponse(
        [{
          field: "server",
          message: "Invalid data type in request",
          code: "TYPE_ERROR"
        }],
        400,
        "Data type error"
      );
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return createErrorResponse(
        [{
          field: "server",
          message: "External service unavailable",
          code: "SERVICE_UNAVAILABLE"
        }],
        503,
        "External service unavailable"
      );
    }

    if (error.name === "FirebaseError") {
      return createErrorResponse(
        [{
          field: "database",
          message: "Database operation failed",
          code: "FIREBASE_ERROR"
        }],
        503,
        "Database service error"
      );
    }

    // Generic server error
    return createErrorResponse(
      [{
        field: "server",
        message: process.env.NODE_ENV === "development"
          ? error.message || "Internal server error"
          : "An unexpected error occurred",
        code: "INTERNAL_SERVER_ERROR"
      }],
      500,
      "Internal server error"
    );
  }
}


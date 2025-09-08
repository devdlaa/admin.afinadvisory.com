import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { SEND_EMAIL } from "@/utils/sendemail";
import jwt from "jsonwebtoken";
import { requirePermission } from "@/lib/requirePermission";
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_WEB_URL || "https://afinadvisory.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "info@afinadvisory.com";

// Password Reset Request Schema
const PasswordResetSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase(),
});

// Response helpers
const createSuccessResponse = (message, data = {}, status = 200) => {
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
  const errorArray = Array.isArray(errors) ? errors : [errors];

  const formattedErrors = errorArray.map((error) => ({
    field: error.field || "unknown",
    message: error.message || "An error occurred",
    code: error.code || "VALIDATION_ERROR",
    receivedValue: error.receivedValue || undefined,
  }));

  return NextResponse.json(
    {
      success: false,
      message: message || "Request validation failed",
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
};

// Send password reset email
async function sendPasswordResetEmail(userData, resetToken) {
  try {
    // Validate required data
    if (!userData?.email || !userData?.name || !resetToken) {
      throw new Error("Missing required data for sending password reset email");
    }

    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const emailResult = await SEND_EMAIL({
      to: userData.email,
      type: "SEND_USER_PWD_RESET_LINK",
      variables: {
        recipientName: userData.name,
        resetLink,
        expiryHours: 24,
      },
    });

    if (!emailResult?.success) {
      throw new Error(
        emailResult?.error || "Email service returned unsuccessful response"
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Password reset email sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send password reset email",
    };
  }
}

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(req, "users.reset_password");
    if (permissionCheck) return permissionCheck;

    if (!JWT_SECRET) {
      console.error("JWT_SECRET not configured");
      return createErrorResponse(
        [
          {
            field: "server",
            message: "Server configuration error",
            code: "MISSING_JWT_SECRET",
          },
        ],
        500,
        "Server configuration error"
      );
    }

    // Request body parsing
    let body;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === "") {
        return createErrorResponse(
          [
            {
              field: "body",
              message: "Request body is empty",
              code: "EMPTY_BODY",
            },
          ],
          400,
          "Empty request body"
        );
      }

      body = JSON.parse(rawBody);

      if (!body || typeof body !== "object") {
        return createErrorResponse(
          [
            {
              field: "body",
              message: "Request body must be a valid JSON object",
              code: "INVALID_JSON_OBJECT",
            },
          ],
          400,
          "Invalid request body format"
        );
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return createErrorResponse(
        [
          {
            field: "body",
            message: "Invalid JSON format in request body",
            code: "JSON_PARSE_ERROR",
          },
        ],
        400,
        "Invalid JSON in request body"
      );
    }

    // Input validation
    let validatedData;
    try {
      if (!body.email?.trim()) {
        return createErrorResponse(
          [
            {
              field: "email",
              message: "Email is required",
              code: "MISSING_REQUIRED_FIELD",
            },
          ],
          400,
          "Missing required field: email"
        );
      }

      validatedData = PasswordResetSchema.parse(body);
    } catch (validationError) {
      console.error("Validation error:", validationError);

      if (validationError instanceof ZodError) {
        const formattedErrors = validationError.errors.map((error) => ({
          field: error.path.join(".") || "unknown",
          message: error.message,
          code: "VALIDATION_ERROR",
          receivedValue: error.received,
        }));

        return createErrorResponse(
          formattedErrors,
          400,
          "Input validation failed"
        );
      }

      return createErrorResponse(
        [
          {
            field: "validation",
            message: validationError.message,
            code: "VALIDATION_ERROR",
          },
        ],
        400,
        "Input validation failed"
      );
    }

    // Database operations
    let db, usersRef, userQuery;
    try {
      db = admin.firestore();
      usersRef = db.collection("admin_users");
    } catch (dbError) {
      console.error("Database initialization error:", dbError);
      return createErrorResponse(
        [
          {
            field: "database",
            message: "Database connection failed",
            code: "DB_CONNECTION_ERROR",
          },
        ],
        503,
        "Database service unavailable"
      );
    }

    // Check if user exists
    let existingUser;
    try {
      userQuery = await usersRef
        .where("email", "==", validatedData.email)
        .limit(1)
        .get();

      if (userQuery.empty) {
        // For security reasons, we don't reveal if email exists or not
        // But we still return success to prevent email enumeration
        return createSuccessResponse(
          "If a user with this email exists, a password reset link has been sent",
          { emailSent: false },
          200
        );
      }

      existingUser = userQuery.docs[0].data();

      // Additional check: only send reset link for active users
      if (existingUser.status !== "active") {
        return createSuccessResponse(
          "If a user with this email exists, a password reset link has been sent",
          { emailSent: false },
          200
        );
      }
    } catch (queryError) {
      console.error("User query error:", queryError);
      return createErrorResponse(
        [
          {
            field: "database",
            message: "Failed to check user existence",
            code: "DB_QUERY_ERROR",
          },
        ],
        503,
        "Database query failed"
      );
    }

    // Generate reset token
    let resetToken;
    try {
      resetToken = jwt.sign(
        {
          email: existingUser.email,
          userCode: existingUser.userCode,
          name: existingUser.name,
          purpose: "password_reset",
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
    } catch (tokenError) {
      console.error("Token generation error:", tokenError);
      return createErrorResponse(
        [
          {
            field: "server",
            message: "Failed to generate reset token",
            code: "TOKEN_GENERATION_ERROR",
          },
        ],
        500,
        "Token generation failed"
      );
    }

    // Update user document with reset token info
    try {
      const userDocRef = usersRef.doc(userQuery.docs[0].id);
      const now = new Date().toISOString();
      const resetExpiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      await userDocRef.update({
        resetToken,
        resetExpiresAt,
        lastPasswordResetRequestAt: now,
        updatedAt: now,
      });
    } catch (updateError) {
      console.error("User update error:", updateError);
      return createErrorResponse(
        [
          {
            field: "database",
            message: "Failed to update user record",
            code: "DB_UPDATE_ERROR",
          },
        ],
        500,
        "Failed to process password reset request"
      );
    }

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(existingUser, resetToken);

    // Prepare response
    const responseData = {
      email: validatedData.email,
      emailSent: emailResult.success,
    };

    if (!emailResult.success) {
      responseData.warning =
        "Reset request processed but email could not be sent";
      responseData.emailError = emailResult.error;

      console.warn(
        `Password reset requested for ${validatedData.email} but email failed:`,
        emailResult.error
      );
    }

    const message = emailResult.success
      ? "Password reset link has been sent to your email"
      : "Password reset request processed but email could not be sent";

    const status = emailResult.success ? 200 : 206; // 206 = Partial Content

    return createSuccessResponse(message, responseData, status);
  } catch (error) {
    console.error(
      "Unexpected error in POST /api/admin/users/reset-password:",
      error
    );

    // Specific error type handling
    if (error.name === "TypeError") {
      return createErrorResponse(
        [
          {
            field: "server",
            message: "Invalid data type in request",
            code: "TYPE_ERROR",
          },
        ],
        400,
        "Data type error"
      );
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return createErrorResponse(
        [
          {
            field: "server",
            message: "External service unavailable",
            code: "SERVICE_UNAVAILABLE",
          },
        ],
        503,
        "External service unavailable"
      );
    }

    if (error.name === "FirebaseError") {
      return createErrorResponse(
        [
          {
            field: "database",
            message: "Database operation failed",
            code: "FIREBASE_ERROR",
          },
        ],
        503,
        "Database service error"
      );
    }

    // Generic server error
    return createErrorResponse(
      [
        {
          field: "server",
          message:
            process.env.NODE_ENV === "development"
              ? error.message || "Internal server error"
              : "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR",
        },
      ],
      500,
      "Internal server error"
    );
  }
}

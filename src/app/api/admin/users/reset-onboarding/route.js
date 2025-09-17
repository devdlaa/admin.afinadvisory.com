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

// CHANGED: Updated schema name and comments from "Password Reset" to "Onboarding Reset"
// Onboarding Reset Request Schema
const OnboardingResetSchema = z.object({
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

// CHANGED: Function name and comments updated from "sendPasswordResetEmail" to "sendOnboardingResetEmail"
// Send onboarding reset email
async function sendOnboardingResetEmail(userData, resetToken) {
  try {
    // Validate required data
    if (!userData?.email || !userData?.name || !resetToken) {
      throw new Error("Missing required data for sending onboarding reset email");
    }

    // CHANGED: Updated URL path from "/reset-password" to "/reset-onboarding" and variable name
    const onboardingResetLink = `${FRONTEND_URL}user-onboarding?token=${resetToken}`;

    const emailResult = await SEND_EMAIL({
      to: userData.email,
      type: "SEND_USER_ONBOARDING_RESET_LINK", 
      variables: {
        recipientName: userData.name,
        onboardingResetLink: onboardingResetLink,
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
  
    console.error("Onboarding reset email sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send onboarding reset email",
    };
  }
}

export async function POST(req) {
  try {
   
    const permissionCheck = await requirePermission(req, "users.reset-onboarding");
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


      validatedData = OnboardingResetSchema.parse(body);
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
   
        return createSuccessResponse(
          "If a user with this email exists, an onboarding reset link has been sent",
          { emailSent: false },
          200
        );
      }

      existingUser = userQuery.docs[0].data();

     
      if (existingUser.status !== "active") {
        return createSuccessResponse(
          "If a user with this email exists, an onboarding reset link has been sent",
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
          purpose: "onboarding_reset", // CHANGED: Updated purpose from "password_reset" to "onboarding_reset"
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
        // CHANGED: Updated field name from "lastPasswordResetRequestAt" to "lastOnboardingResetRequestAt"
        lastOnboardingResetRequestAt: now,
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
        // CHANGED: Updated error message from "password reset" to "onboarding reset"
        "Failed to process onboarding reset request"
      );
    }

    // CHANGED: Updated function call from sendPasswordResetEmail to sendOnboardingResetEmail
    // Send onboarding reset email
    const emailResult = await sendOnboardingResetEmail(existingUser, resetToken);

    // Prepare response
    const responseData = {
      email: validatedData.email,
      emailSent: emailResult.success,
    };

    if (!emailResult.success) {
      // CHANGED: Updated warning message from "Reset request" to "Onboarding reset request"
      responseData.warning =
        "Onboarding reset request processed but email could not be sent";
      responseData.emailError = emailResult.error;

      // CHANGED: Updated console log message from "Password reset" to "Onboarding reset"
      console.warn(
        `Onboarding reset requested for ${validatedData.email} but email failed:`,
        emailResult.error
      );
    }

    // CHANGED: Updated success and error messages from "Password reset" to "Onboarding reset"
    const message = emailResult.success
      ? "Onboarding reset link has been sent to your email"
      : "Onboarding reset request processed but email could not be sent";

    const status = emailResult.success ? 200 : 206; // 206 = Partial Content

    return createSuccessResponse(message, responseData, status);
  } catch (error) {
    // CHANGED: Updated error log from "reset-password" to "reset-onboarding"
    console.error(
      "Unexpected error in POST /api/admin/users/reset-onboarding:",
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
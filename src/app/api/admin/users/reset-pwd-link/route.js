import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { SEND_EMAIL } from "@/utils/sendemail";
import { requirePermission } from "@/lib/requirePermission";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

const FRONTEND_URL = process.env.WEB_URL;

// Simple in-memory rate limiting (5 attempts per email per 15 minutes)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_ATTEMPTS = 5;

const RequestSchema = z.object({
  email: z.string().email("Please provide a valid email").trim().toLowerCase(),
});

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(
      req,
      "users.reset_password"
    );
    if (permissionCheck) return permissionCheck;

    // Parse and validate request body
    const body = await req.json();
    const { email } = RequestSchema.parse(body);

    // Simple rate limiting check
    const now = Date.now();
    const key = email.toLowerCase();
    const attempts = rateLimitMap.get(key) || [];

    // Clean old attempts outside window
    const recentAttempts = attempts.filter(
      (time) => now - time < RATE_LIMIT_WINDOW
    );

    if (recentAttempts.length >= RATE_LIMIT_ATTEMPTS) {
      return createErrorResponse(
        "Too many reset attempts. Please try again later.",
        429,
        "RATE_LIMIT_EXCEEDED"
      );
    }

    // Record this attempt
    recentAttempts.push(now);
    rateLimitMap.set(key, recentAttempts);

    // Check if user exists (don't reveal existence for security)
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // Return success regardless of whether email exists (security best practice)
      return createSuccessResponse(
        "If the email exists, a password reset link has been sent."
      );
    }

    // Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${FRONTEND_URL}/login`,
    });

    // Send reset email
    const emailResult = await SEND_EMAIL({
      to: email,
      type: "SEND_USER_PWD_RESET_LINK",
      variables: {
        recipientName: userRecord.displayName || userRecord.email || "User",
        resetLink,
        expiryHours: 24,
      },
    });

    // Handle email sending failure
    if (!emailResult?.success) {
      console.error("Email sending failed:", emailResult?.error);
      return createErrorResponse(
        "Failed to send password reset email. Please try again.",
        500,
        "EMAIL_SEND_FAILED"
      );
    }

    return createSuccessResponse(
      "If the email exists, a password reset link has been sent."
    );
  } catch (error) {
    console.error("Password reset error:", error);

    // Handle validation errors
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return createErrorResponse(
        "Invalid input provided",
        400,
        "VALIDATION_ERROR",
        validationErrors
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid JSON format", 400, "INVALID_JSON");
    }

    // Handle Firebase admin errors
    if (error.code?.startsWith("auth/")) {
      return createErrorResponse(
        "Authentication service error",
        500,
        "AUTH_SERVICE_ERROR"
      );
    }

    // Generic server error
    return createErrorResponse(
      "An unexpected error occurred. Please try again.",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}

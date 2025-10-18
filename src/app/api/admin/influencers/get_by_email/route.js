import admin from "@/lib/firebase-admin";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

const db = admin.firestore();

// Zod schema for email input
const EmailSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export async function POST(req) {
  const startTime = Date.now();

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON"
      );
    }

    // Validate email using Zod
    const parse = EmailSchema.safeParse(body);

    if (!parse.success) {
      const errorMessages = parse.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        errorMessages
      );
    }

    const { email } = parse.data;

    // Query influencer by lowercase email
    const querySnap = await db
      .collection("influencers")
      .where("lowercase_email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (querySnap.empty) {
      return createErrorResponse(
        "Influencer not found",
        404,
        "INFLUENCER_NOT_FOUND",
        [
          {
            field: "email",
            message: `No influencer found with email: ${email}`,
          },
        ]
      );
    }

    const doc = querySnap.docs[0];
    const data = doc.data();

    // Prepare influencer response (exclude sensitive data)
    const influencer = {
      id: doc.id,
      email: data.email,
      name: data.name,
      username: data.username,
      status: data.status,
      verificationStatus: data.verificationStatus,
      defaultCommissionRate: data.defaultCommissionRate,
      profileImageUrl: data.profileImageUrl,
      referralCode: data.referralCode,
      createdAt: data.createdAt,
      lastActiveAt: data.lastActiveAt,
    };

    const executionTimeMs = Date.now() - startTime;

    return createSuccessResponse(
      "Influencer retrieved successfully",
      influencer,
      { executionTimeMs }
    );
  } catch (err) {
    console.error("Get influencer by email API error:", {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    // Handle specific Firestore errors
    if (err.code === "permission-denied") {
      return createErrorResponse(
        "Database permission denied",
        403,
        "DATABASE_PERMISSION_DENIED"
      );
    }

    if (err.code === "unavailable") {
      return createErrorResponse(
        "Database service temporarily unavailable",
        503,
        "DATABASE_UNAVAILABLE"
      );
    }

    if (err.code === "deadline-exceeded") {
      return createErrorResponse(
        "Database operation timed out",
        504,
        "DATABASE_TIMEOUT"
      );
    }

    return createErrorResponse(
      "Internal server error",
      500,
      "INTERNAL_SERVER_ERROR",
      [
        {
          field: "server",
          message:
            process.env.NODE_ENV === "development"
              ? err.message
              : "An unexpected error occurred",
        },
      ]
    );
  }
}

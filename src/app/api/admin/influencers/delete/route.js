import admin from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";

// Validation schema for query parameters
const deleteInfluencerSchema = z.object({
  id: z.string()
    .min(1, "Influencer ID cannot be empty")
    .max(100, "Influencer ID is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid influencer ID format")
});

// Standardized response helpers
const createSuccessResponse = (message, data = null) => {
  return NextResponse.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const createErrorResponse = (message, statusCode = 500, errorCode = null) => {
  return NextResponse.json({
    success: false,
    error: {
      message,
      code: errorCode,
      timestamp: new Date().toISOString()
    }
  }, { status: statusCode });
};

export async function DELETE(req) {
  let db;
  let influencerId;

  try {

    const permissionCheck = await requirePermission(req, "influencers.delete");
    if (permissionCheck) return permissionCheck;

    // Extract and validate query parameters
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");

    // Validate input using Zod
    const validationResult = deleteInfluencerSchema.safeParse({ id: rawId });
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => err.message)
        .join(", ");
      
      return createErrorResponse(
        `Validation failed: ${errorMessage}`,
        400,
        "VALIDATION_ERROR"
      );
    }

    influencerId = validationResult.data.id;

    // Initialize Firestore connection
    db = admin.firestore();

    // Check if influencer exists before attempting deletion
    const influencerDoc = await db.collection("influencers").doc(influencerId).get();
    
    if (!influencerDoc.exists) {
      return createErrorResponse(
        "Influencer not found",
        404,
        "INFLUENCER_NOT_FOUND"
      );
    }

    // Perform the deletion
    await db.collection("influencers").doc(influencerId).delete();

    // Log successful deletion for audit purposes
    console.log(`✅ Influencer ${influencerId} successfully deleted by admin`);

    return createSuccessResponse(
      "Influencer deleted successfully",
      { deletedId: influencerId }
    );

  } catch (err) {
    // Enhanced error logging with more context
    console.error("🔥 Error deleting influencer:", {
      error: err.message,
      stack: err.stack,
      influencerId: influencerId || "unknown",
      timestamp: new Date().toISOString(),
      url: req.url
    });

    // Handle specific Firebase/Firestore errors
    if (err.code) {
      switch (err.code) {
        case 'permission-denied':
          return createErrorResponse(
            "Database permission denied",
            403,
            "DATABASE_PERMISSION_DENIED"
          );
        case 'unavailable':
          return createErrorResponse(
            "Database service temporarily unavailable",
            503,
            "DATABASE_UNAVAILABLE"
          );
        case 'deadline-exceeded':
          return createErrorResponse(
            "Database operation timed out",
            504,
            "DATABASE_TIMEOUT"
          );
        default:
          return createErrorResponse(
            "Database operation failed",
            500,
            "DATABASE_ERROR"
          );
      }
    }

    // Generic server error for unexpected issues
    return createErrorResponse(
      "An unexpected error occurred while deleting the influencer",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}
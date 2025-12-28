import admin from "@/lib/firebase-admin";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

// Validation schema for query parameters
const deleteInfluencerSchema = z.object({
  id: z
    .string()
    .min(1, "Influencer ID cannot be empty")
    .max(100, "Influencer ID is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid influencer ID format"),
});

export async function DELETE(req) {
  let db;
  let influencerId;
  let influencerData = null;
  let authUid = null;
  let authDeleted = false;

  try {
    // Permission check
    const permissionCheck = await requirePermission(req, "influencers.delete");
    if (permissionCheck) return permissionCheck;

    // Extract and validate query parameters
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");

    // Validate input using Zod
    const validationResult = deleteInfluencerSchema.safeParse({ id: rawId });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((err) => err.message)
        .join(", ");

      return createErrorResponse(
        `Validation failed: ${errorMessage}`,
        400,
        "VALIDATION_ERROR",
        validationResult.error.errors
      );
    }

    influencerId = validationResult.data.id;

    // Initialize Firestore connection
    db = admin.firestore();

    // STEP 1: Check if influencer exists and get data
    const influencerDoc = await db
      .collection("influencers")
      .doc(influencerId)
      .get();

    if (!influencerDoc.exists) {
      return createErrorResponse(
        "Influencer not found",
        404,
        "INFLUENCER_NOT_FOUND"
      );
    }

    // Store influencer data for potential rollback
    influencerData = influencerDoc.data();
    authUid = influencerData.authUid;

    // STEP 2: CRITICAL SECURITY CHECK - Check for commission records
    console.log(
      `🔍 Checking for commission records for influencer: ${influencerId}`
    );

    const commissionQuery = await db
      .collection("commissions")
      .where("influencerId", "==", influencerId)
      .limit(1)
      .get();

    if (!commissionQuery.empty) {
      const commissionCount = commissionQuery.size;
      return createErrorResponse(
        "Cannot delete influencer with existing commission records. This is a critical operation that could affect financial data.",
        403,
        "HAS_COMMISSION_RECORDS",
        [
          {
            field: "commissions",
            message: `Influencer has ${commissionCount}+ commission record(s). Please resolve or archive commissions before deletion.`,
          },
        ]
      );
    }

    console.log(
      `✅ No commission records found. Safe to proceed with deletion.`
    );

    // STEP 4: Delete Firebase Auth User (if exists)
    if (authUid) {
      try {
        await admin.auth().deleteUser(authUid);
        authDeleted = true;
        console.log(`✅ Deleted Auth user: ${authUid}`);
      } catch (authError) {
        console.error("Failed to delete Auth user:", authError);

        // If auth user not found, it's okay to continue
        if (authError.code === "auth/user-not-found") {
          console.log(
            `⚠️ Auth user ${authUid} not found, continuing with Firestore deletion`
          );
        } else {
          // For other auth errors, return error without deleting Firestore
          return createErrorResponse(
            "Failed to delete authentication account",
            500,
            "AUTH_DELETE_FAILED",
            [
              {
                field: "auth",
                message: `Could not delete auth user: ${authError.message}`,
              },
            ]
          );
        }
      }
    } else {
      console.log(`⚠️ No authUid found for influencer ${influencerId}`);
    }

    // STEP 5: Delete Firestore Document
    try {
      await db.collection("influencers").doc(influencerId).delete();
      console.log(`✅ Deleted Firestore document: ${influencerId}`);
    } catch (firestoreError) {
      console.error("Failed to delete Firestore document:", firestoreError);

      // Rollback: Restore Auth user if we deleted it
      if (authDeleted && authUid) {
        try {
          // Recreate auth user with original data
          await admin.auth().createUser({
            uid: authUid,
            email: influencerData.email,
            displayName: influencerData.name,
            phoneNumber: influencerData.phone || null,
            disabled: influencerData.status === "inactive",
          });
          console.log(`✅ Rolled back Auth user: ${authUid}`);
        } catch (rollbackError) {
          console.error(`❌ Failed to rollback Auth user:`, rollbackError);
          // Critical: Both operations failed
          return createErrorResponse(
            "Critical error: Failed to delete Firestore document and could not rollback Auth deletion",
            500,
            "CRITICAL_DELETE_FAILURE",
            [
              {
                field: "critical",
                message:
                  "Auth user was deleted but Firestore deletion failed. Manual intervention required.",
                authUid,
                influencerId,
              },
            ]
          );
        }
      }

      return createErrorResponse(
        "Failed to delete influencer data",
        500,
        "FIRESTORE_DELETE_FAILED",
        [
          {
            field: "firestore",
            message: firestoreError.message,
          },
        ]
      );
    }

    // SUCCESS: Log for audit purposes
    console.log(
      `✅ Influencer ${influencerId} successfully deleted by admin (Auth: ${authDeleted})`
    );

    return createSuccessResponse("Influencer deleted successfully", {
      deletedId: influencerId,
      authDeleted,
      email: influencerData.email,
      name: influencerData.name,
    });
  } catch (err) {
    // Enhanced error logging with more context
    console.error("🔥 Critical error deleting influencer:", {
      error: err.message,
      stack: err.stack,
      influencerId: influencerId || "unknown",
      authUid: authUid || "unknown",
      authDeleted,
      timestamp: new Date().toISOString(),
      url: req.url,
    });

    // Attempt rollback if Auth was deleted but Firestore wasn't
    if (authDeleted && authUid && influencerData) {
      console.log("🔄 Attempting emergency rollback...");

      try {
        // Recreate auth user
        await admin.auth().createUser({
          uid: authUid,
          email: influencerData.email,
          displayName: influencerData.name,
          phoneNumber: influencerData.phone || null,
          disabled: influencerData.status === "inactive",
        });
        console.log(`✅ Emergency rollback: Restored Auth user ${authUid}`);
      } catch (rollbackError) {
        console.error(`❌ Emergency rollback failed:`, rollbackError);
      }
    }

    // Handle specific Firebase/Firestore errors
    if (err.code) {
      switch (err.code) {
        case "permission-denied":
          return createErrorResponse(
            "Database permission denied",
            403,
            "DATABASE_PERMISSION_DENIED"
          );
        case "unavailable":
          return createErrorResponse(
            "Database service temporarily unavailable",
            503,
            "DATABASE_UNAVAILABLE"
          );
        case "deadline-exceeded":
          return createErrorResponse(
            "Database operation timed out",
            504,
            "DATABASE_TIMEOUT"
          );
        default:
          return createErrorResponse(
            "Database operation failed",
            500,
            "DATABASE_ERROR",
            [{ field: "database", message: err.message }]
          );
      }
    }

    // Generic server error for unexpected issues
    return createErrorResponse(
      "An unexpected error occurred while deleting the influencer",
      500,
      "INTERNAL_SERVER_ERROR",
      [{ field: "server", message: err.message }]
    );
  }
}

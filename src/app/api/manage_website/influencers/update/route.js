import admin from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";

// ID validation schema
const influencerIdSchema = z.object({
  id: z
    .string()
    .min(1, "Influencer ID cannot be empty")
    .max(100, "Influencer ID is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid influencer ID format"),
});

const updateInfluencerSchema = z
  .object({
    // Basic fields
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .trim()
      .optional(),
    email: z
      .string()
      .email("Invalid email format")
      .toLowerCase()
      .trim()
      .optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username must be less than 50 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      )
      .trim()
      .optional(),
    defaultCommissionRate: z
      .number()
      .min(0, "Commission rate cannot be negative")
      .max(100, "Commission rate cannot exceed 100%")
      .optional(),

    // Optional fields with validation
    phone: z
      .string()
      .regex(/^[\+]?[1-9][\d]{0,15}$/, "Invalid phone number format")
      .optional(),
    referralCode: z
      .string()
      .min(4, "Referral code must be at least 4 characters")
      .max(20, "Referral code must be less than 20 characters")
      .regex(
        /^[A-Z0-9]+$/,
        "Referral code can only contain uppercase letters and numbers"
      )
      .optional(),
    profileImageUrl: z.string().url("Invalid profile image URL").optional(),
    tags: z
      .array(z.string().min(1).max(50))
      .max(20, "Maximum 20 tags allowed")
      .optional(),
    customCommission: z
      .object({
        kind: z.enum(["fixed", "percent"]),
        amount: z.number().positive("Commission amount must be positive"),
        maxCommission: z
          .number()
          .positive("Max commission must be positive")
          .optional(),
      })
      .optional(),
    adminNotes: z
      .string()
      .max(1000, "Admin notes cannot exceed 1000 characters")
      .optional(),
    status: z.enum(["active", "inactive"]).optional(),
    totalCommissionEarned: z.number().nonnegative().optional(),
    totalCommissionPaid: z.number().nonnegative().optional(),
    lastCommissionPaidAt: z.string().nullable().optional(),

    // Enhanced fields
    bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
    socialLinks: z
      .array(
        z.object({
          platform: z.enum([
            "instagram",
            "twitter",
            "tiktok",
            "youtube",
            "facebook",
            "linkedin",
            "other",
          ]),
          url: z.string().url("Invalid social media URL"),
        })
      )
      .max(10, "Maximum 10 social links allowed")
      .optional(),
    address: z
      .object({
        lane: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        pincode: z
          .string()
          .regex(/^[0-9]{4,10}$/, "Invalid pincode format")
          .optional(),
        country: z.string().max(100).optional(),
      })
      .optional(),

    // Payout fields
    preferredPayoutMethod: z
      .enum(["paypal", "bank_transfer", "upi"])
      .optional(),
    bankDetails: z
      .object({
        accountHolderName: z.string().max(100).optional(),
        accountNumber: z
          .string()
          .regex(/^[0-9]{8,20}$/, "Invalid account number format")
          .optional(),
        ifscCode: z
          .string()
          .regex(/^[A-Z]{4}0[A-Z0-9]{5,8}$/, "Invalid IFSC code format")
          .optional(),
        bankName: z.string().max(100).optional(),
        upiId: z
          .string()
          .regex(
            /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{2,64}$/,
            "Invalid UPI ID format"
          )
          .optional(),
        paypalEmail: z.string().email("Invalid PayPal email").optional(),
      })
      .optional(),

    totalCampaigns: z.number().int().nonnegative().optional(),
    totalSales: z.number().nonnegative().optional(),
    engagementRate: z
      .number()
      .min(0, "Engagement rate cannot be negative")
      .max(100, "Engagement rate cannot exceed 100%")
      .optional(),
    preferredContactMethod: z
      .enum(["email", "phone", "social", "other"])
      .optional(),
    verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
    additionalInfo: z
      .array(
        z.object({
          key: z
            .string()
            .min(1, "Key cannot be empty")
            .max(50, "Key cannot exceed 50 characters"),
          value: z.string().max(500, "Value cannot exceed 500 characters"),
        })
      )
      .max(20, "Maximum 20 additional info items allowed")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Protected fields that should not be updated directly
const PROTECTED_FIELDS = [
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "lastUpdatedBy",
  "authUid", // Protect auth UID from direct updates
];

// Standardized response helpers
const createSuccessResponse = (message, data = null) => {
  return NextResponse.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const createErrorResponse = (message, statusCode = 500, errorCode = null) => {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code: errorCode,
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
};

// Helper function to sanitize update data
const sanitizeUpdateData = (data) => {
  const sanitized = { ...data };

  // Remove protected fields
  PROTECTED_FIELDS.forEach((field) => {
    delete sanitized[field];
  });

  // Add lowercase fields for search if updating name/email/username
  if (sanitized.name) {
    sanitized.lowercase_name = sanitized.name.toLowerCase();
  }
  if (sanitized.email) {
    sanitized.lowercase_email = sanitized.email.toLowerCase();
  }
  if (sanitized.username) {
    sanitized.lowercase_username = sanitized.username.toLowerCase();
  }

  // Add system fields
  sanitized.updatedAt = new Date().toISOString();

  return sanitized;
};

// Rollback helper for Auth user email
async function rollbackAuthEmail(authUid, originalEmail) {
  try {
    if (authUid && originalEmail) {
      await admin.auth().updateUser(authUid, {
        email: originalEmail,
      });
      console.log(`✅ Rolled back Auth email to: ${originalEmail}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to rollback Auth email for ${authUid}:`, error);
    return false;
  }
}

// Rollback helper for Auth user status
async function rollbackAuthStatus(authUid, originalStatus) {
  try {
    if (authUid) {
      const disabled = originalStatus === "inactive";
      await admin.auth().updateUser(authUid, {
        disabled,
      });
      console.log(
        `✅ Rolled back Auth status to: ${originalStatus} (disabled: ${disabled})`
      );
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to rollback Auth status for ${authUid}:`, error);
    return false;
  }
}

export async function PATCH(req) {
  let db;
  let influencerId;
  let requestBody;
  let authUid;
  let originalData = {};
  let authUpdates = {
    email: false,
    status: false,
  };

  try {
    const [permissionError] = await requirePermission(
      req,
      "influencers.update"
    );
    if (permissionError) return permissionError;

    // Validate URL parameters
    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");

    const idValidation = influencerIdSchema.safeParse({ id: rawId });
    if (!idValidation.success) {
      const errorMessage = idValidation.error.errors
        .map((err) => err.message)
        .join(", ");

      return createErrorResponse(
        `Invalid influencer ID: ${errorMessage}`,
        400,
        "INVALID_ID"
      );
    }

    influencerId = idValidation.data.id;

    // Parse and validate request body
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON"
      );
    }

    // Validate request body against schema
    const bodyValidation = updateInfluencerSchema.safeParse(requestBody);
    if (!bodyValidation.success) {
      const errorMessages = bodyValidation.error.issues
        ?.map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");

      return createErrorResponse(
        `Validation failed: ${errorMessages}`,
        400,
        "VALIDATION_ERROR"
      );
    }

    const validatedData = bodyValidation.data;

    // Initialize Firestore connection
    db = admin.firestore();
    const docRef = db.collection("influencers").doc(influencerId);

    // Check if influencer exists and get current data
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return createErrorResponse(
        "Influencer not found",
        404,
        "INFLUENCER_NOT_FOUND"
      );
    }

    const existingData = docSnap.data();
    authUid = existingData.authUid;

    // Store original values for potential rollback
    originalData = {
      email: existingData.email,
      status: existingData.status,
    };

    // Check if authUid exists
    if (!authUid) {
      return createErrorResponse(
        "Auth UID not found for this influencer",
        400,
        "MISSING_AUTH_UID"
      );
    }

    // Verify Auth user exists
    try {
      await admin.auth().getUser(authUid);
    } catch (authError) {
      console.error("Auth user not found:", authError);
      return createErrorResponse(
        "Associated authentication account not found",
        404,
        "AUTH_USER_NOT_FOUND"
      );
    }

    // Check for unique constraints (email, username, referralCode)
    const queries = [];

    if (validatedData.email && validatedData.email !== existingData.email) {
      queries.push({
        type: "email",
        promise: db
          .collection("influencers")
          .where("email", "==", validatedData.email)
          .limit(1)
          .get(),
      });
    }

    // Check for duplicates
    if (queries.length > 0) {
      const results = await Promise.all(queries.map((q) => q.promise));
      const conflicts = [];

      results.forEach((result, index) => {
        if (!result.empty) {
          // Make sure the conflicting document is not the same influencer
          const conflictDoc = result.docs[0];
          if (conflictDoc.id !== influencerId) {
            conflicts.push(queries[index].type);
          }
        }
      });

      if (conflicts.length > 0) {
        return createErrorResponse(
          `Duplicate values found for: ${conflicts.join(", ")}`,
          409,
          "DUPLICATE_VALUES"
        );
      }
    }

    // Check if email already exists in Firebase Auth (different user)
    if (validatedData.email && validatedData.email !== existingData.email) {
      try {
        const existingAuthUser = await admin
          .auth()
          .getUserByEmail(validatedData.email);

        // If found and it's a different user, return error
        if (existingAuthUser.uid !== authUid) {
          return createErrorResponse(
            "Email already in use by another account",
            409,
            "EMAIL_IN_USE_AUTH"
          );
        }
      } catch (authError) {
        // If error is "user not found", that's good - email is available
        if (authError.code !== "auth/user-not-found") {
          throw authError; // Re-throw unexpected errors
        }
      }
    }

    // STEP 1: Update Firebase Auth User
    const authUpdatePayload = {};
    let authUpdateNeeded = false;

    // Update email in Auth if changed
    if (validatedData.email && validatedData.email !== existingData.email) {
      authUpdatePayload.email = validatedData.email;
      authUpdateNeeded = true;
      authUpdates.email = true;
    }

    // Update status (enabled/disabled) in Auth if changed
    if (validatedData.status && validatedData.status !== existingData.status) {
      authUpdatePayload.disabled = validatedData.status === "inactive";
      authUpdateNeeded = true;
      authUpdates.status = true;
    }

    // Perform Auth update if needed
    if (authUpdateNeeded) {
      try {
        await admin.auth().updateUser(authUid, authUpdatePayload);
        console.log(`✅ Updated Auth user ${authUid}:`, authUpdatePayload);
      } catch (authError) {
        console.error("Failed to update Auth user:", authError);

        // Handle specific auth errors
        if (authError.code === "auth/email-already-exists") {
          return createErrorResponse(
            "Email already in use by another account",
            409,
            "EMAIL_IN_USE"
          );
        }

        if (authError.code === "auth/invalid-email") {
          return createErrorResponse(
            "Invalid email format",
            400,
            "INVALID_EMAIL"
          );
        }

        throw new Error(`Auth update failed: ${authError.message}`);
      }
    }

    // STEP 2: Update Firestore Document
    const updateData = sanitizeUpdateData(validatedData);

    try {
      await docRef.update(updateData);
      console.log(`✅ Updated Firestore document ${influencerId}`);
    } catch (firestoreError) {
      console.error("Failed to update Firestore:", firestoreError);

      // Rollback Auth updates if Firestore update failed
      const rollbackPromises = [];

      if (authUpdates.email) {
        rollbackPromises.push(rollbackAuthEmail(authUid, originalData.email));
      }
      if (authUpdates.status) {
        rollbackPromises.push(rollbackAuthStatus(authUid, originalData.status));
      }

      await Promise.allSettled(rollbackPromises);

      return createErrorResponse(
        "Failed to update influencer data. Auth changes have been rolled back.",
        500,
        "FIRESTORE_UPDATE_FAILED"
      );
    }

    // STEP 3: Fetch and return updated document
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    // Remove sensitive information from response
    const { bankDetails, ...safeData } = updatedData;
    const safeBankDetails = bankDetails
      ? {
          ...bankDetails,
          accountNumber: bankDetails?.accountNumber
            ? `****${bankDetails.accountNumber.slice(-4)}`
            : undefined,
        }
      : undefined;

    const responseData = {
      ...safeData,
      bankDetails: safeBankDetails,
    };

    // Build success message
    const updatedFields = [];
    if (authUpdates.email) updatedFields.push("email");
    if (authUpdates.status) updatedFields.push("status");

    const message =
      updatedFields.length > 0
        ? `Influencer updated successfully. Auth fields updated: ${updatedFields.join(
            ", "
          )}`
        : "Influencer updated successfully";

    return createSuccessResponse(message, responseData);
  } catch (err) {
    // Critical error - attempt to rollback everything
    console.error("🔥 Critical error updating influencer:", {
      error: err.message,
      stack: err.stack,
      influencerId: influencerId || "unknown",
      authUid: authUid || "unknown",
      requestBody: requestBody ? Object.keys(requestBody) : "unparsed",
      timestamp: new Date().toISOString(),
      url: req.url,
    });

    // Attempt rollback of all Auth changes
    const rollbackPromises = [];

    if (authUpdates.email) {
      rollbackPromises.push(rollbackAuthEmail(authUid, originalData.email));
    }
    if (authUpdates.status) {
      rollbackPromises.push(rollbackAuthStatus(authUid, originalData.status));
    }

    if (rollbackPromises.length > 0) {
      await Promise.allSettled(rollbackPromises);
      console.log("🔄 Attempted to rollback all Auth changes");
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
        case "invalid-argument":
          return createErrorResponse(
            "Invalid data provided for update",
            400,
            "INVALID_UPDATE_DATA"
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
      "An unexpected error occurred while updating the influencer",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}

import admin from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";

// ID validation schema
const influencerIdSchema = z.object({
  id: z
    .string()
    .min(1, "Influencer ID cannot be empty")
    .max(100, "Influencer ID is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid influencer ID format"),
});

// Partial schema for updates - all fields are optional except for system fields
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
    preferredPayoutMethod: z
      .enum(["paypal", "bank_transfer", "upi", "crypto"])
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
          .regex(/^[A-Z]{4}[0-9]{7}$/, "Invalid IFSC code format")
          .optional(),
        swiftCode: z
          .string()
          .regex(
            /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
            "Invalid SWIFT code format"
          )
          .optional(),
        iban: z
          .string()
          .regex(
            /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/,
            "Invalid IBAN format"
          )
          .optional(),
        bankName: z.string().max(100).optional(),
        bankCountry: z.string().max(100).optional(),
        upiId: z
          .string()
          .regex(
            /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{2,64}$/,
            "Invalid UPI ID format"
          )
          .optional(),
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
      .optional()
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

  // Add system fields
  sanitized.updatedAt = new Date().toISOString();

  return sanitized;
};

export async function PATCH(req) {
  let db;
  let influencerId;
  let requestBody;

  try {
    // Permission check - uncomment and configure based on your permission mapping
    const permissionCheck = await requirePermission(req, "influencers.update");
    if (permissionCheck) return permissionCheck;

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
      const errorMessages = bodyValidation.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
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

    // Check if influencer exists
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return createErrorResponse(
        "Influencer not found",
        404,
        "INFLUENCER_NOT_FOUND"
      );
    }

    // Check for unique constraints (email, username, referralCode)
    if (
      validatedData.email ||
      validatedData.username ||
      validatedData.referralCode
    ) {
      const existingData = docSnap.data();
      const queries = [];

      if (validatedData.email && validatedData.email !== existingData.email) {
        queries.push(
          db
            .collection("influencers")
            .where("email", "==", validatedData.email)
            .limit(1)
            .get()
        );
      }

      if (
        validatedData.username &&
        validatedData.username !== existingData.username
      ) {
        queries.push(
          db
            .collection("influencers")
            .where("username", "==", validatedData.username)
            .limit(1)
            .get()
        );
      }

      if (
        validatedData.referralCode &&
        validatedData.referralCode !== existingData.referralCode
      ) {
        queries.push(
          db
            .collection("influencers")
            .where("referralCode", "==", validatedData.referralCode)
            .limit(1)
            .get()
        );
      }

      const results = await Promise.all(queries);
      const conflicts = [];

      results.forEach((result, index) => {
        if (!result.empty) {
          const field =
            validatedData.email && index === 0
              ? "email"
              : validatedData.username &&
                (validatedData.email ? index === 1 : index === 0)
              ? "username"
              : "referralCode";
          conflicts.push(field);
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

    // Sanitize and prepare update data
    const updateData = sanitizeUpdateData(validatedData);

    // Perform the update
    await docRef.update(updateData);

    // Fetch updated document
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    // Remove sensitive information from response
    const { bankDetails, ...safeData } = updatedData;
    const safeBankDetails = bankDetails
      ? {
          ...bankDetails,
          accountNumber: bankDetails.accountNumber
            ? `****${bankDetails.accountNumber.slice(-4)}`
            : undefined,
          iban: bankDetails.iban
            ? `****${bankDetails.iban.slice(-4)}`
            : undefined,
        }
      : undefined;

    const responseData = {
      ...safeData,
      bankDetails: safeBankDetails,
    };

    // Log successful update for audit purposes
    console.log(`✅ Influencer ${influencerId} successfully updated by admin`, {
      updatedFields: Object.keys(updateData),
      timestamp: new Date().toISOString(),
    });

    return createSuccessResponse(
      "Influencer updated successfully",
      responseData
    );
  } catch (err) {
    // Enhanced error logging with more context
    console.error("🔥 Error updating influencer:", {
      error: err.message,
      stack: err.stack,
      influencerId: influencerId || "unknown",
      requestBody: requestBody ? Object.keys(requestBody) : "unparsed",
      timestamp: new Date().toISOString(),
      url: req.url,
    });

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

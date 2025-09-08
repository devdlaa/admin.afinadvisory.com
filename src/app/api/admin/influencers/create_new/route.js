import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z, ZodError } from "zod";
import { auth } from "@/utils/auth";
import { v4 as uuidv4 } from "uuid";

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

// Enhanced influencer schema with better validation
const influencerSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .trim(),
  defaultCommissionRate: z
    .number()
    .min(0, "Commission rate cannot be negative")
    .max(100, "Commission rate cannot exceed 100%"),

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
  status: z.enum(["active", "inactive"]).default("active"),
  totalCommissionEarned: z.number().nonnegative().default(0),
  totalCommissionPaid: z.number().nonnegative().default(0),
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
  location: z
    .object({
      city: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
    })
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
  totalCampaigns: z.number().int().nonnegative().default(0),
  totalSales: z.number().nonnegative().default(0),
  engagementRate: z
    .number()
    .min(0, "Engagement rate cannot be negative")
    .max(100, "Engagement rate cannot exceed 100%")
    .optional(),
  preferredContactMethod: z
    .enum(["email", "phone", "social", "other"])
    .optional(),
  verificationStatus: z
    .enum(["pending", "verified", "rejected"])
    .default("pending"),
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
});

// Business logic validation
async function validateInfluencerData(db, data) {
  const errors = [];

  // Check for duplicate email
  const emailQuery = await db
    .collection("influencers")
    .where("email", "==", data.email)
    .limit(1)
    .get();

  if (!emailQuery.empty) {
    errors.push({
      field: "email",
      message: "An influencer with this email already exists",
    });
  }

  // Check for duplicate username
  const usernameQuery = await db
    .collection("influencers")
    .where("username", "==", data.username)
    .limit(1)
    .get();

  if (!usernameQuery.empty) {
    errors.push({
      field: "username",
      message: "This username is already taken",
    });
  }

  

  // Validate custom commission logic
  if (data.customCommission) {
    const { kind, amount, maxCommission } = data.customCommission;

    if (kind === "percent" && amount > 100) {
      errors.push({
        field: "customCommission.amount",
        message: "Percentage commission cannot exceed 100%",
      });
    }

    if (maxCommission && amount > maxCommission) {
      errors.push({
        field: "customCommission.maxCommission",
        message: "Max commission must be greater than commission amount",
      });
    }
  }

  // Validate bank details consistency
  if (data.bankDetails) {
    const { preferredPayoutMethod } = data;
    if (preferredPayoutMethod === "bank_transfer") {
      const { accountNumber, ifscCode, swiftCode } = data.bankDetails;
      if (!accountNumber) {
        errors.push({
          field: "bankDetails.accountNumber",
          message: "Account number is required for bank transfer payout",
        });
      }
      // Require either IFSC (India) or SWIFT code (International)
      if (!ifscCode && !swiftCode) {
        errors.push({
          field: "bankDetails",
          message:
            "Either IFSC code or SWIFT code is required for bank transfers",
        });
      }
    }

    if (preferredPayoutMethod === "upi" && !data.bankDetails.upiId) {
      errors.push({
        field: "bankDetails.upiId",
        message: "UPI ID is required for UPI payout method",
      });
    }
  }

  return errors;
}

// Generate unique influencer ID and referral code
function generateInfluencerIds(name) {
  const id = `influencer_${uuidv4().slice(0, 8)}`;

  // Generate referral code from name if not provided
  const nameCode = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4);
  const randomCode = Math.random().toString(36).substr(2, 4).toUpperCase();
  const referralCode = `${nameCode}${randomCode}`;

  return { id, referralCode };
}

export async function POST(req) {
  try {
    const session = await auth();
    // TODO: Add permission check
    const permissionCheck = await requirePermission(req, "influencers.create");
    if (permissionCheck) return permissionCheck;

    const db = admin.firestore();

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
      validatedData = influencerSchema.parse(body);
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

    // Business logic validation
    const businessErrors = await validateInfluencerData(db, validatedData);
    if (businessErrors.length > 0) {
      return createErrorResponse(
        "Influencer data validation failed",
        businessErrors,
        409 // Conflict status for duplicates
      );
    }

    // Generate IDs and prepare document
    const { id, referralCode: generatedReferralCode } = generateInfluencerIds(
      validatedData.name
    );
    const now = new Date().toISOString();

    const influencerDoc = {
      ...validatedData,
      id,
      // Use provided referral code or generate one
      referralCode: validatedData.referralCode || generatedReferralCode,
      // Add search-friendly fields
      lowercase_name: validatedData.name.toLowerCase(),
      lowercase_email: validatedData.email.toLowerCase(),
      lowercase_username: validatedData.username.toLowerCase(),
      // Set timestamps
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
      // Add audit trail
      createdBy: session?.user?.id  || "admin", // TODO: Replace with actual user ID from session
    };

    // Create influencer document
    await db.collection("influencers").doc(id).set(influencerDoc);

    // Prepare response data (exclude sensitive information)
    const responseData = {
      id: influencerDoc.id,
      name: influencerDoc.name,
      email: influencerDoc.email,
      username: influencerDoc.username,
      referralCode: influencerDoc.referralCode,
      status: influencerDoc.status,
      defaultCommissionRate: influencerDoc.defaultCommissionRate,
      verificationStatus: influencerDoc.verificationStatus,
      createdAt: influencerDoc.createdAt,
      // Include non-sensitive optional fields if present
      ...(influencerDoc.profileImageUrl && {
        profileImageUrl: influencerDoc.profileImageUrl,
      }),
      ...(influencerDoc.tags && { tags: influencerDoc.tags }),
      ...(influencerDoc.bio && { bio: influencerDoc.bio }),
      ...(influencerDoc.location && { location: influencerDoc.location }),
    };

    return createSuccessResponse(
      `Influencer '${validatedData.name}' created successfully`,
      responseData,
      201
    );
  } catch (error) {
    // Log error for monitoring
    console.error("Create influencer operation failed:", {
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
            message: "Insufficient permissions to create influencers",
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
        : "An unexpected error occurred while creating the influencer";

    return createErrorResponse(
      "Internal server error",
      [{ field: "server", message: errorMessage }],
      500
    );
  }
}

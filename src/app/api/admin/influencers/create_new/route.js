import admin from "@/lib/firebase-admin";
import { z, ZodError } from "zod";
import { auth } from "@/utils/auth";
import { v4 as uuidv4 } from "uuid";
import { SEND_EMAIL } from "@/utils/sendemail";

import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

import { requirePermission } from "@/lib/requirePermission";

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
  preferredPayoutMethod: z.enum(["bank_transfer", "upi"]).optional(),
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

      bankName: z.string().max(100).optional(),

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
async function validateInfluencerData(data) {
  const errors = [];

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
      const { accountNumber, ifscCode } = data.bankDetails;
      if (!accountNumber) {
        errors.push({
          field: "bankDetails.accountNumber",
          message: "Account number is required for bank transfer payout",
        });
      }
      // Require IFSC code for India
      if (!ifscCode) {
        errors.push({
          field: "bankDetails",
          message: "IFSC code is required for bank transfers",
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

// Cleanup function for rollback
async function cleanupAuth(uid) {
  try {
    if (uid) {
      await admin.auth().deleteUser(uid);
      console.log(`Rolled back auth user: ${uid}`);
    }
  } catch (error) {
    console.error(`Failed to rollback auth user ${uid}:`, error);
  }
}

async function cleanupFirestore(id) {
  try {
    if (id) {
      const db = admin.firestore();
      await db.collection("influencers").doc(id).delete();
      console.log(`Rolled back Firestore document: ${id}`);
    }
  } catch (error) {
    console.error(`Failed to rollback Firestore document ${id}:`, error);
  }
}

export async function POST(req) {
  let newInfluencerAuthUid = null;
  let influencerId = null;
  let resetLink = null;

  try {
    const session = await auth();

    // Check permissions
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
        400,
        "INVALID_JSON",
        ["Request body must be valid JSON"]
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
        return createErrorResponse(
          "Validation failed",
          400,
          "VALIDATION_ERROR",
          formattedErrors
        );
      }

      return createErrorResponse(
        "Data validation failed",
        400,
        "VALIDATION_ERROR",
        [{ field: "validation", message: validationError.message }]
      );
    }

    // Business logic validation
    const businessErrors = await validateInfluencerData(validatedData);
    if (businessErrors.length > 0) {
      return createErrorResponse(
        "Influencer data validation failed",
        400,
        "VALIDATION_ERROR",
        businessErrors
      );
    }

    // Check if email already exists in Firebase Auth
    try {
      const existingAuthUser = await admin
        .auth()
        .getUserByEmail(validatedData.email);

      console.log("User already exists in Auth:", existingAuthUser.uid);

      return createErrorResponse(
        "Existing Account: Email Already in Use",
        409,
        "DUPLICATE_EMAIL",
        [
          {
            field: "email",
            message: "An account with this email already exists",
          },
        ]
      );
    } catch (error) {
      // If user not found, proceed with creation
      if (error.code !== "auth/user-not-found") {
        throw error; // Re-throw unexpected errors
      }
    }

    // STEP 1: Create Firebase Auth User
    let newInfluencerAuth;
    try {
      const authUserData = {
        disabled: false,
        displayName: validatedData.name,
        email: validatedData.email,
        emailVerified: false,
      };

      newInfluencerAuth = await admin.auth().createUser(authUserData);
      newInfluencerAuthUid = newInfluencerAuth.uid;

      console.log("Created Auth user:", newInfluencerAuthUid);
    } catch (authError) {
      console.error("Failed to create Auth user:", authError);

      // Handle specific auth errors
      if (authError.code === "auth/email-already-exists") {
        return createErrorResponse(
          "Email Already in Use",
          409,
          "DUPLICATE_EMAIL",
          [
            {
              field: "email",
              message: "An account with this email already exists",
            },
          ]
        );
      }

      if (authError.code === "auth/phone-number-already-exists") {
        return createErrorResponse(
          "Phone Number Already in Use",
          409,
          "DUPLICATE_PHONE",
          [
            {
              field: "phone",
              message: "An account with this phone number already exists",
            },
          ]
        );
      }

      if (authError.code === "auth/invalid-phone-number") {
        return createErrorResponse(
          "Invalid Phone Number",
          400,
          "INVALID_PHONE",
          [
            {
              field: "phone",
              message: "The provided phone number is invalid",
            },
          ]
        );
      }

      throw new Error(`Auth user creation failed: ${authError.message}`);
    }

    // STEP 2: Generate password reset link
    try {
      resetLink = await admin
        .auth()
        .generatePasswordResetLink(validatedData.email, {
          url:
            process.env.NEXT_PUBLIC_APP_URL || "https://share.afinadvisory.com",
        });

      console.log("Generated password reset link");
    } catch (resetLinkError) {
      console.error("Failed to generate password reset link:", resetLinkError);

      // Rollback: Delete auth user
      await cleanupAuth(newInfluencerAuthUid);

      return createErrorResponse(
        "Failed to Generate Password Reset Link",
        500,
        "RESET_LINK_GENERATION_FAILED",
        [
          {
            field: "email",
            message:
              "Could not generate password reset link. User creation rolled back.",
          },
        ]
      );
    }

    // STEP 3: Create Firestore Document
    try {
      // Generate IDs and prepare document
      const { id, referralCode: generatedReferralCode } = generateInfluencerIds(
        validatedData.name
      );
      influencerId = id;
      const now = new Date().toISOString();

      const influencerDoc = {
        ...validatedData,
        id,
        authUid: newInfluencerAuthUid, // Link to Firebase Auth user
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
        createdBy: session?.user?.id || "system",
        passwordResetSentAt: now,
      };

      await db.collection("influencers").doc(id).set(influencerDoc);
      console.log("Created Firestore document:", id);
    } catch (firestoreError) {
      console.error("Failed to create Firestore document:", firestoreError);

      // Rollback: Delete auth user
      await cleanupAuth(newInfluencerAuthUid);

      return createErrorResponse(
        "Database Operation Failed",
        500,
        "FIRESTORE_ERROR",
        [
          {
            field: "database",
            message:
              "Failed to create influencer record. User creation rolled back.",
          },
        ]
      );
    }

    // STEP 4: Send Password Reset Email
    try {
      await SEND_EMAIL({
        to: validatedData.email,
        type: "INFLUNCER_PASSWORD_RESET_NOTIFICATION",
        variables: {
          recipientName: validatedData.name,
          resetLink,
          expiryHours: 24,
        },
      });

      console.log("Password reset email sent successfully");
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);

      // Don't rollback - influencer is created, just log the email failure
      // We'll return success but note that email failed
      console.warn(
        `Influencer ${influencerId} created but password reset email failed to send`
      );

      // Optionally, you could update the Firestore doc to mark email as failed
      try {
        await db.collection("influencers").doc(influencerId).update({
          passwordResetEmailFailed: true,
          passwordResetEmailError: emailError.message,
          updatedAt: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error("Failed to update email failure status:", updateError);
      }

      // Prepare response data
      const responseData = {
        id: influencerId,
        name: validatedData.name,
        email: validatedData.email,
        username: validatedData.username,
        referralCode: validatedData.referralCode,
        status: validatedData.status,
        defaultCommissionRate: validatedData.defaultCommissionRate,
        verificationStatus: validatedData.verificationStatus,
        authUid: newInfluencerAuthUid,
        emailSent: false,
        warning: "Influencer created but password reset email failed to send",
      };

      return createSuccessResponse(
        `Influencer '${validatedData.name}' created but email notification failed`,
        responseData,
        201
      );
    }

    // SUCCESS: Everything worked
    const responseData = {
      id: influencerId,
      name: validatedData.name,
      email: validatedData.email,
      username: validatedData.username,
      referralCode: validatedData.referralCode || influencerId,
      status: validatedData.status,
      defaultCommissionRate: validatedData.defaultCommissionRate,
      verificationStatus: validatedData.verificationStatus,
      authUid: newInfluencerAuthUid,
      emailSent: true,
      createdAt: new Date().toISOString(),
      // Include non-sensitive optional fields if present
      ...(validatedData.profileImageUrl && {
        profileImageUrl: validatedData.profileImageUrl,
      }),
      ...(validatedData.tags && { tags: validatedData.tags }),
      ...(validatedData.bio && { bio: validatedData.bio }),
      ...(validatedData.location && { location: validatedData.location }),
    };

    return createSuccessResponse(
      `Influencer '${validatedData.name}' created successfully. Password reset email sent.`,
      responseData,
      201
    );
  } catch (error) {
    // Critical error occurred - attempt rollback
    console.error("Critical error in influencer creation:", {
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Attempt to rollback both Auth and Firestore
    await Promise.allSettled([
      cleanupAuth(newInfluencerAuthUid),
      cleanupFirestore(influencerId),
    ]);

    // Handle specific Firebase errors
    if (error.code === "permission-denied") {
      return createErrorResponse("Access Denied", 403, "PERMISSION_DENIED", [
        {
          field: "permissions",
          message: "Insufficient permissions to create influencers",
        },
      ]);
    }

    if (error.code === "unavailable") {
      return createErrorResponse(
        "Service Temporarily Unavailable",
        503,
        "SERVICE_UNAVAILABLE",
        [
          {
            field: "server",
            message:
              "Database service is currently unavailable. Please try again later.",
          },
        ]
      );
    }

    if (error.code === "deadline-exceeded") {
      return createErrorResponse("Request Timeout", 408, "TIMEOUT", [
        {
          field: "server",
          message: "Operation took too long to complete. Please try again.",
        },
      ]);
    }

    // Generic server error
    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error.message || "Internal server error"
        : "An unexpected error occurred while creating the influencer";

    return createErrorResponse(
      "Internal Server Error",
      500,
      "INTERNAL_SERVER_ERROR",
      [{ field: "server", message: errorMessage }]
    );
  }
}

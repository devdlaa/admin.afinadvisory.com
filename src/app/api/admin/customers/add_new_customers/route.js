import admin from "@/lib/firebase-admin";
import { z, ZodError } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import { requirePermission } from "@/lib/requirePermission";
import { auth as clientAuth } from "@/utils/auth";

const db = admin.firestore();
const auth = admin.auth();

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// FIXED: Zod schema for address state validation
const AddUserSchema = z
  .object({
    // Mandatory fields
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name cannot exceed 50 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "First name can only contain letters, spaces, hyphens, and apostrophes"
      )
      .trim(),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name cannot exceed 50 characters")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Last name can only contain letters, spaces, hyphens, and apostrophes"
      )
      .trim(),
    email: z
      .string()
      .email("Invalid email address")
      .max(254, "Email address too long")
      .toLowerCase()
      .trim(),
    phoneNumber: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .max(15, "Phone number cannot exceed 15 digits")
      .regex(/^[0-9]+$/, "Phone number can only contain digits")
      .trim(),

    // Optional fields
    gender: z
      .enum(["male", "female", "other", "prefer-not-to-say", ""])
      .optional()
      .default(""),
    dob: z
      .string()
      .refine((date) => {
        if (!date) return true;
        const parsedDate = new Date(date);
        const now = new Date();
        const minAge = new Date(
          now.getFullYear() - 120,
          now.getMonth(),
          now.getDate()
        );
        return parsedDate <= now && parsedDate >= minAge;
      }, "Invalid date of birth")
      .optional()
      .default(""),
    alternatePhone: z
      .string()
      .refine((phone) => {
        if (!phone) return true;
        return /^[0-9]{10,15}$/.test(phone);
      }, "Alternate phone number must be 10-15 digits")
      .optional()
      .default(""),

    // FIXED: Address schema - state is properly validated
    address: z.object({
      street: z
        .string()
        .max(200, "Street address too long")
        .optional()
        .default(""),
      pincode: z
        .string()
        .refine((pin) => {
          if (!pin) return true;
          return /^[0-9]{4,10}$/.test(pin);
        }, "Pincode must be 4-10 digits")
        .optional()
        .default(""),
      state: z
        .string()
        .optional()
        .refine((val) => {
          if (!val) return true;
          return INDIAN_STATES.includes(val);
        }, "Invalid state. Please select a valid Indian state.")
        .default(""),
      city: z.string().max(50, "City name too long").optional().default(""),
      country: z
        .string()
        .max(50, "Country name too long")
        .optional()
        .default(""),
    }),
  })
  .refine(
    (data) => {
      if (data.alternatePhone && data.alternatePhone === data.phoneNumber) {
        return false;
      }
      return true;
    },
    {
      message:
        "Alternate phone number must be different from primary phone number",
      path: ["alternatePhone"],
    }
  );

// FIXED: Enhanced duplicate checking with proper error handling
async function checkDuplicates(email, phoneNumber, alternatePhone) {
  try {
    const duplicates = { email: false, phone: false, alternatePhone: false };

    // FIXED: Check email duplicate with proper null check
    if (email) {
      const emailQuery = await db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();
      duplicates.email = !emailQuery.empty;
    }

    // FIXED: Check primary phone duplicate with proper null check
    if (phoneNumber) {
      const phoneQuery = await db
        .collection("users")
        .where("phoneNumber", "==", phoneNumber)
        .limit(1)
        .get();
      duplicates.phone = !phoneQuery.empty;
    }

    // FIXED: Check alternate phone duplicate properly
    if (alternatePhone) {
      // Check if alternate phone exists as primary phone
      const altPhoneAsPrimaryQuery = await db
        .collection("users")
        .where("phoneNumber", "==", alternatePhone)
        .limit(1)
        .get();

      // Check if alternate phone exists as alternate phone
      const altPhoneAsAltQuery = await db
        .collection("users")
        .where("alternatePhone", "==", alternatePhone)
        .limit(1)
        .get();

      duplicates.alternatePhone =
        !altPhoneAsPrimaryQuery.empty || !altPhoneAsAltQuery.empty;
    }

    return duplicates;
  } catch (error) {
    console.error("Error checking duplicates:", error);
    throw new Error(
      `Failed to check for duplicate user data: ${error.message}`
    );
  }
}

// FIXED: Helper to format phone number for Firebase Auth with validation
const formatPhoneForFirebase = (phoneNumber) => {
  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  // Remove any leading zeros and add country code
  const cleanPhone = phoneNumber.replace(/^0+/, "");

  // FIXED: Validate phone length after cleaning
  if (cleanPhone.length < 10 || cleanPhone.length > 12) {
    throw new Error("Invalid phone number length");
  }

  return `+91${cleanPhone}`;
};

export async function POST(req) {
  const startTime = Date.now();
  let userRecord = null;

  try {
    // FIXED: Properly handle session check
    let session;
    try {
      session = await clientAuth();
    } catch (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("Authentication failed", 401, "AUTH_FAILED");
    }

    // Permission check - uncomment and configure based on your permission mapping
    const permissionCheck = await requirePermission(req, "customers.create");
    if (permissionCheck) return permissionCheck;

    // FIXED: Parse and validate request body with better error handling
    let body;
    try {
      const bodyText = await req.text();
      if (!bodyText.trim()) {
        return createErrorResponse(
          "Request body cannot be empty",
          400,
          "EMPTY_BODY"
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return createErrorResponse(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON",
        [{ message: parseError.message }]
      );
    }

    // FIXED: Validate required fields exist in body
    if (!body || typeof body !== "object") {
      return createErrorResponse(
        "Request body must be a valid JSON object",
        400,
        "INVALID_BODY_TYPE"
      );
    }

    const parsed = AddUserSchema.safeParse(body);

    if (!parsed.success) {
      const validationErrors = parsed.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      console.error("Validation errors:", validationErrors);
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validationErrors
      );
    }

    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      gender,
      dob,
      alternatePhone,
      address,
    } = parsed.data;

    // FIXED: Check for duplicates with proper error handling
    let duplicates;
    try {
      duplicates = await checkDuplicates(email, phoneNumber, alternatePhone);
    } catch (duplicateError) {
      console.error("Duplicate check error:", duplicateError);
      return createErrorResponse(
        "Failed to verify user uniqueness",
        500,
        "DUPLICATE_CHECK_FAILED",
        [{ message: duplicateError.message }]
      );
    }

    if (duplicates.email || duplicates.phone || duplicates.alternatePhone) {
      const errors = [];
      const duplicateFields = {};

      if (duplicates.email) {
        errors.push("Email already exists");
        duplicateFields.email = true;
      }
      if (duplicates.phone) {
        errors.push("Phone number already exists");
        duplicateFields.phone = true;
      }
      if (duplicates.alternatePhone) {
        errors.push("Alternate phone number already exists");
        duplicateFields.alternatePhone = true;
      }

      return createErrorResponse(
        "Duplicate user data found",
        409,
        "DUPLICATE_DATA",
        { errors, duplicateFields }
      );
    }

    // FIXED: Create Firebase Auth user with proper validation
    let formattedPhone;
    try {
      formattedPhone = formatPhoneForFirebase(phoneNumber);
    } catch (phoneError) {
      console.error("Phone formatting error:", phoneError);
      return createErrorResponse(
        "Invalid phone number format",
        400,
        "PHONE_FORMAT_ERROR",
        [{ message: phoneError.message }]
      );
    }

    try {
      userRecord = await auth.createUser({
        email: email,
        emailVerified: false,
        phoneNumber: formattedPhone,
        disabled: false,
        displayName: `${firstName} ${lastName}`,
      });
    } catch (authCreateError) {
      // Handle specific Firebase Auth errors with better messages
      if (authCreateError.code === "auth/email-already-exists") {
        return createErrorResponse(
          "Email already exists in authentication system",
          409,
          "AUTH_EMAIL_EXISTS"
        );
      }
      if (authCreateError.code === "auth/phone-number-already-exists") {
        return createErrorResponse(
          "Phone number already exists in authentication system",
          409,
          "AUTH_PHONE_EXISTS"
        );
      }
      if (authCreateError.code === "auth/invalid-email") {
        return createErrorResponse(
          "Invalid email address format",
          400,
          "AUTH_INVALID_EMAIL"
        );
      }
      if (authCreateError.code === "auth/invalid-phone-number") {
        return createErrorResponse(
          "Invalid phone number format",
          400,
          "AUTH_INVALID_PHONE"
        );
      }

      throw authCreateError; // Re-throw for generic handling
    }

    // FIXED: Prepare user document for Firestore with proper validation
    const now = new Date().toISOString();
    const userDoc = {
      id: userRecord.uid,
      uid: userRecord.uid,
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      phoneNumber: phoneNumber,
      alternatePhone: alternatePhone || "",
      isPhoneVerified: false,
      isEmailVerified: false,
      gender: gender || "",
      dob: dob || "",
      address: {
        street: address?.street || "",
        pincode: address?.pincode || "",
        state: address?.state || "",
        city: address?.city || "",
        country: address?.country || "",
      },
      role: "user",
      isProfileCompleted: false,
      accountStatus: "active",
      loginMethod: ["email"],
      createdAt: now,
      updatedAt: now,
      needsGoogleLinking: false,
      isCreatedByAdmin: true,
      createdBy: session?.user?.id || session?.user?.uid || "admin",
    };

    // FIXED: Save to Firestore with proper error handling
    try {
      await db.collection("users").doc(userRecord.uid).set(userDoc);
    } catch (firestoreError) {
      console.error("Firestore save error:", firestoreError);

      // Clean up Firebase Auth user if Firestore fails
      try {
        await auth.deleteUser(userRecord.uid);
        console.log(
          `🧹 Cleaned up Firebase Auth user ${userRecord.uid} after Firestore failure`
        );
      } catch (cleanupError) {
        console.error("Failed to cleanup Firebase Auth user:", cleanupError);
      }

      return createErrorResponse(
        "Failed to save user data",
        500,
        "DATABASE_SAVE_FAILED",
        [{ message: firestoreError.message }]
      );
    }

    // FIXED: Generate password reset link with error handling
    let resetLink;
    try {
      resetLink = await auth.generatePasswordResetLink(email);
    } catch (resetLinkError) {
      console.error("Password reset link generation error:", resetLinkError);
      // Don't fail the entire operation, just log the error
      resetLink = null;
    }

    const executionTimeMs = Date.now() - startTime;

    // FIXED: Remove sensitive information from response properly
    const { createdBy, ...safeUserData } = userDoc;
    const responseData = {
      id: userRecord.uid,
      ...safeUserData,
    };

    // Log successful creation for audit purposes
    console.log(`✅ Customer ${userRecord.uid} successfully created by admin`, {
      email: email,
      name: `${firstName} ${lastName}`,
      timestamp: now,
      createdBy: session?.user?.id || session?.user?.uid || "admin",
    });

    const responsePayload = {
      user: responseData,
    };

    // Only include reset link if it was successfully generated
    if (resetLink) {
      responsePayload.passwordResetLink = resetLink;
    }

    return createSuccessResponse(
      "Customer created successfully",
      responsePayload,
      {
        executionTimeMs,
        note: resetLink
          ? "Password reset link has been generated for account setup"
          : "User created successfully, but password reset link generation failed",
      }
    );
  } catch (err) {
    // FIXED: If user was created in Firebase Auth but something else failed, clean up
    if (userRecord?.uid) {
      try {
        await auth.deleteUser(userRecord.uid);
        console.log(
          `🧹 Cleaned up Firebase Auth user ${userRecord.uid} after failure`
        );
      } catch (cleanupError) {
        console.error("Failed to cleanup Firebase Auth user:", cleanupError);
      }
    }

    // Handle specific Firebase Auth errors
    if (err.code === "auth/email-already-exists") {
      return createErrorResponse(
        "Email already exists in authentication system",
        409,
        "AUTH_EMAIL_EXISTS"
      );
    }

    if (err.code === "auth/phone-number-already-exists") {
      return createErrorResponse(
        "Phone number already exists in authentication system",
        409,
        "AUTH_PHONE_EXISTS"
      );
    }

    if (err.code === "auth/invalid-email") {
      return createErrorResponse(
        "Invalid email address format",
        400,
        "AUTH_INVALID_EMAIL"
      );
    }

    if (err.code === "auth/invalid-phone-number") {
      return createErrorResponse(
        "Invalid phone number format",
        400,
        "AUTH_INVALID_PHONE"
      );
    }

    // Handle other Firebase Auth errors
    if (err.code && err.code.startsWith("auth/")) {
      return createErrorResponse(
        "Authentication system error",
        400,
        "AUTH_ERROR",
        [{ message: err.message, firebaseCode: err.code }]
      );
    }

    // Handle Firestore errors
    if (
      err.code &&
      (err.code.includes("firestore") || err.code === "permission-denied")
    ) {
      return createErrorResponse(
        "Database operation failed",
        500,
        "DATABASE_ERROR",
        [{ message: err.message }]
      );
    }

    // Handle network/timeout errors
    if (err.code === "unavailable" || err.code === "deadline-exceeded") {
      return createErrorResponse(
        "Service temporarily unavailable",
        503,
        "SERVICE_UNAVAILABLE"
      );
    }

    // FIXED: Generic server error with more details
    return createErrorResponse(
      "An unexpected error occurred while creating the customer",
      500,
      "INTERNAL_SERVER_ERROR",
      [{ message: err.message }]
    );
  }
}

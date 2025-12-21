import admin from "@/lib/firebase-admin";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

import { auth as clientAuth } from "@/utils/auth";
import { AddUserWithOptionalEmailSchema } from "@/app/schemas/ClientSchema";
import { syncClientToAlgolia } from "@/lib/algoliaSync";

const db = admin.firestore();

// Check if user exists by phone or email
async function findExistingUser(phoneNumber, email) {
  try {
    // Check by phone number first
    const phoneQuery = await db
      .collection("users")
      .where("phoneNumber", "==", phoneNumber)
      .limit(1)
      .get();

    if (!phoneQuery.empty) {
      const userData = phoneQuery.docs[0].data();
      return {
        exists: true,
        user: { id: phoneQuery.docs[0].id, ...userData },
        matchedBy: "phone",
      };
    }

    // Check by email if provided
    if (email) {
      const emailQuery = await db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        const userData = emailQuery.docs[0].data();
        return {
          exists: true,
          user: { id: emailQuery.docs[0].id, ...userData },
          matchedBy: "email",
        };
      }
    }

    return { exists: false, user: null, matchedBy: null };
  } catch (error) {
    console.error("Error checking for existing user:", error);
    throw new Error(
      `Failed to check for existing user: ${error.message}`
    );
  }
}


// Format minimal user data for response
function formatUserResponse(userData) {
  return {
    id: userData.id,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: userData.phoneNumber,
    email: userData.email || null,
    alternatePhone: userData.alternatePhone || null,
    is_crm_user: userData.is_crm_user || false,
    accountStatus: userData.accountStatus,
    createdAt: userData.createdAt,
  };
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    // Authentication check
    let session = null;
    try {
      session = await clientAuth();
    } catch (authError) {
      console.error("Authentication error:", authError);
      return createErrorResponse("Authentication failed", 401, "AUTH_FAILED");
    }

    // Parse and validate request body
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

    // Validate request body structure
    if (!body || typeof body !== "object") {
      return createErrorResponse(
        "Request body must be a valid JSON object",
        400,
        "INVALID_BODY_TYPE"
      );
    }

    // Validate with Zod schema
    const parsed = AddUserWithOptionalEmailSchema.safeParse(body);

    if (!parsed.success) {
      const validationErrors = parsed.error.issues.map((err) => ({
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
      phoneNumber,
      email,
      gender,
      dob,
      alternatePhone,
      address,
    } = parsed.data;

    // Normalize email (empty string to null)
    const normalizedEmail = email && email.trim() !== "" ? email : null;

    // Check if user already exists by phone or email
    let existingUserCheck;
    try {
      existingUserCheck = await findExistingUser(phoneNumber, normalizedEmail);
    } catch (checkError) {
      console.error("Error checking existing user:", checkError);
      return createErrorResponse(
        "Failed to verify user uniqueness",
        500,
        "USER_CHECK_FAILED",
        [{ message: checkError.message }]
      );
    }

    // If user exists, return existing user without updates
    if (existingUserCheck.exists) {
      const executionTimeMs = Date.now() - startTime;

      console.log(`ℹ️ Existing user found`, {
        matchedBy: existingUserCheck.matchedBy,
        userId: existingUserCheck.user.id,
        phone: phoneNumber,
        email: normalizedEmail,
      });

      return createSuccessResponse(
        "User already exists",
        formatUserResponse(existingUserCheck.user),
        {
          is_new_user: false,
          match_found_by: existingUserCheck.matchedBy,
          executionTimeMs,
        }
      );
    }

    // Create new CRM user
    // Let Firestore auto-generate document ID
    const userDocRef = db.collection("users").doc(); // Auto-generates ID
    const userId = userDocRef.id; // Get the auto-generated ID
    const now = new Date().toISOString();

    const userDoc = {
      id: userId, // Store the auto-generated ID in the document
      uid: userId, // No Firebase Auth user (will be updated when user signs up)
      email: normalizedEmail,
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
      is_crm_user: true, // Mark as CRM-only user
      isProfileCompleted: false,
      accountStatus: "active",
      loginMethod: [],
      createdAt: now,
      updatedAt: now,
      isCreatedByAdmin: true,
      createdBy: session?.user?.id || session?.user?.uid || "admin",
    };

    // Save to Firestore using the pre-generated document reference
    try {
      await userDocRef.set(userDoc);
      syncClientToAlgolia(userDoc);
    } catch (firestoreError) {
      console.error("Firestore save error:", firestoreError);
      return createErrorResponse(
        "Failed to save user data",
        500,
        "DATABASE_SAVE_FAILED",
        [{ message: firestoreError.message }]
      );
    }

    const executionTimeMs = Date.now() - startTime;

    // Log successful creation
    console.log(`✅ CRM user ${userId} successfully created`, {
      phone: phoneNumber,
      email: normalizedEmail,
      name: `${firstName} ${lastName}`,
      timestamp: now,
      createdBy: session?.user?.id || session?.user?.uid || "admin",
    });

    return createSuccessResponse(
      "User created successfully",
      formatUserResponse(userDoc),
      {
        is_new_user: true,
        match_found_by: null,
        executionTimeMs,
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);

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

    // Generic server error
    return createErrorResponse(
      "An unexpected error occurred while creating the user",
      500,
      "INTERNAL_SERVER_ERROR",
      [{ message: err.message }]
    );
  }
}
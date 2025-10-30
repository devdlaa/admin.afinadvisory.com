import admin from "@/lib/firebase-admin";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
const db = admin.firestore();

// Define which fields can be updated by admin (whitelist approach)
const UPDATEABLE_FIELDS = [
  "firstName",
  "lastName",
  "phoneNumber",
  "alternatePhone",
  "dob",
  "gender",
  "accountStatus",
  "address",
  "isProfileCompleted",
];

// Protected fields that should never be updated
const PROTECTED_FIELDS = [
  "uid",
  "id",
  "email", // Email updates require special handling
  "createdAt",
  "createdBy",
  "role", // Role changes should have separate endpoint
  "isEmailVerified",
  "isPhoneVerified",
];

// Enhanced Zod schema for validation
const UpdateCustomerSchema = z.object({
  userId: z
    .string()
    .min(1, "User ID is required")
    .max(128, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format"),
  updateData: z
    .object({
      firstName: z
        .string()
        .min(1, "First name cannot be empty")
        .max(50, "First name too long")
        .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters")
        .trim()
        .optional(),
      lastName: z
        .string()
        .min(1, "Last name cannot be empty")
        .max(50, "Last name too long")
        .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters")
        .trim()
        .optional(),
      phoneNumber: z
        .string()
        .regex(/^[0-9]{10,15}$/, "Phone number must be 10-15 digits")
        .optional(),
      alternatePhone: z
        .string()
        .regex(/^[0-9]{10,15}$/, "Alternate phone must be 10-15 digits")
        .optional(),
      dob: z
        .string()
        .refine((date) => {
          if (!date) return true; // Allow empty
          const parsedDate = new Date(date);
          const now = new Date();
          const minAge = new Date(
            now.getFullYear() - 120,
            now.getMonth(),
            now.getDate()
          );
          return parsedDate <= now && parsedDate >= minAge;
        }, "Invalid date of birth")
        .optional(),
      gender: z
        .enum(["male", "female", "other", "prefer-not-to-say", ""])
        .optional(),
      accountStatus: z.enum(["active", "inactive", "suspended"]).optional(),
      isProfileCompleted: z.boolean().optional(),
      address: z
        .object({
          street: z.string().max(200, "Street address too long").optional(),
          city: z.string().max(50, "City name too long").optional(),
          state: z.string().max(50, "State name too long").optional(),
          country: z.string().max(50, "Country name too long").optional(),
          pincode: z
            .string()
            .regex(/^[0-9]{4,10}$/, "Invalid pincode format")
            .optional(),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    })
    .refine(
      (data) => {
        // Ensure alternate phone is different from primary phone
        if (
          data.alternatePhone &&
          data.phoneNumber &&
          data.alternatePhone === data.phoneNumber
        ) {
          return false;
        }
        return true;
      },
      {
        message:
          "Alternate phone number must be different from primary phone number",
        path: ["alternatePhone"],
      }
    ),
});

// Helper to check for duplicate phone numbers
const checkPhoneDuplicates = async (userId, phoneNumber, alternatePhone) => {
  const duplicates = { primary: false, alternate: false };

  if (phoneNumber) {
    const phoneQuery = await db
      .collection("users")
      .where("phoneNumber", "==", phoneNumber)
      .limit(1)
      .get();

    if (!phoneQuery.empty && phoneQuery.docs[0].id !== userId) {
      duplicates.primary = true;
    }
  }

  if (alternatePhone) {
    const queries = [
      db
        .collection("users")
        .where("phoneNumber", "==", alternatePhone)
        .limit(1)
        .get(),
      db
        .collection("users")
        .where("alternatePhone", "==", alternatePhone)
        .limit(1)
        .get(),
    ];

    const results = await Promise.all(queries);
    const hasConflict = results.some(
      (result) => !result.empty && result.docs[0].id !== userId
    );

    if (hasConflict) {
      duplicates.alternate = true;
    }
  }

  return duplicates;
};

// Helper to sanitize update data
const sanitizeUpdateData = (data, userId) => {
  const sanitized = {};

  // Only include whitelisted fields
  Object?.keys(data)?.forEach((key) => {
    if (UPDATEABLE_FIELDS.includes(key) && !PROTECTED_FIELDS.includes(key)) {
      sanitized[key] = data[key];
    }
  });

  // Add system fields
  sanitized.updatedAt = new Date().toISOString();
  sanitized.lastUpdatedBy = userId;

  return sanitized;
};

// Helper to sanitize customer data for response
const sanitizeCustomerResponse = (customerData) => {
  const {
    bankDetails,
    paymentMethods,
    internalNotes,
    lastLoginIP,
    ...safeData
  } = customerData;

  return safeData;
};

export async function POST(req) {
  let userId;
  let requestBody;

  try {
    // Permission check - uncomment and configure based on your permission mapping
    const permissionCheck = await requirePermission(req, "customers.update");
    if (permissionCheck) return permissionCheck;

    // Parse and validate request body
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "Invalid JSON in request body",
        200,
        "INVALID_JSON"
      );
    }

    const parsed = UpdateCustomerSchema.safeParse(requestBody);

    if (!parsed.success) {
      const validationErrors = parsed.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      return createErrorResponse(
        "Validation failed",
        200,
        "VALIDATION_ERROR",
        validationErrors
      );
    }

    const { userId: validatedUserId, updateData } = parsed.data;
    userId = validatedUserId;

    // Get user document reference and check if exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return createErrorResponse(
        "Customer not found",
        200,
        "CUSTOMER_NOT_FOUND"
      );
    }

    const currentData = userDoc.data();

    // Check for phone number duplicates if phone numbers are being updated
    if (updateData.phoneNumber || updateData.alternatePhone) {
      const duplicates = await checkPhoneDuplicates(
        userId,
        updateData.phoneNumber,
        updateData.alternatePhone
      );

      if (duplicates.primary || duplicates.alternate) {
        const errors = [];
        if (duplicates.primary) errors.push("Phone number already exists");
        if (duplicates.alternate)
          errors.push("Alternate phone number already exists");

        return createErrorResponse(
          "Duplicate phone number found",
          200,
          "DUPLICATE_PHONE",
          { errors, duplicateFields: duplicates }
        );
      }
    }

    // Sanitize update data
    const sanitizedUpdateData = sanitizeUpdateData(updateData, userId);

    // Handle nested address updates (merge with existing)
    if (sanitizedUpdateData.address && currentData.address) {
      sanitizedUpdateData.address = {
        ...currentData.address,
        ...sanitizedUpdateData.address,
      };
    }

    // Validate account status change logic
    if (
      sanitizedUpdateData.accountStatus &&
      sanitizedUpdateData.accountStatus !== currentData.accountStatus
    ) {
      const validTransitions = {
        active: ["inactive", "suspended"],
        inactive: ["active"],
        suspended: ["active", "banned"],
        banned: [], // Banned accounts cannot be changed (require special handling)
      };

      const currentStatus = currentData.accountStatus || "active";

      if (sanitizedUpdateData.accountStatus === "active") {
        await admin.auth().updateUser(userId, {
          disabled: false,
        });
      } else if (sanitizedUpdateData.accountStatus === "inactive") {
        await admin.auth().updateUser(userId, {
          disabled: true,
        });
      }
      if (
        !validTransitions[currentStatus]?.includes(
          sanitizedUpdateData.accountStatus
        )
      ) {
        return createErrorResponse(
          `Cannot change account status from ${currentStatus} to ${sanitizedUpdateData.accountStatus}`,
          200,
          "INVALID_STATUS_TRANSITION"
        );
      }
    }

    // Perform the update
    await userRef.update(sanitizedUpdateData);

    // Fetch updated document
    const updatedDoc = await userRef.get();
    const updatedCustomer = {
      uid: updatedDoc.id,
      ...sanitizeCustomerResponse(updatedDoc.data()),
    };

    return createSuccessResponse("Customer updated successfully", {
      customer: updatedCustomer,
      updatedFields: Object.keys(sanitizedUpdateData).filter(
        (field) => field !== "updatedAt" && field !== "lastUpdatedBy"
      ),
    });
  } catch (error) {
    // Handle specific Firestore errors
    if (error.code === "not-found") {
      return createErrorResponse(
        "Customer not found",
        200,
        "CUSTOMER_NOT_FOUND"
      );
    }

    if (error.code === "permission-denied") {
      return createErrorResponse(
        "Database permission denied",
        200,
        "DATABASE_PERMISSION_DENIED"
      );
    }

    if (error.code === "unavailable") {
      return createErrorResponse(
        "Database service temporarily unavailable",
        200,
        "DATABASE_UNAVAILABLE"
      );
    }

    if (error.code === "deadline-exceeded") {
      return createErrorResponse(
        "Database operation timed out",
        200,
        "DATABASE_TIMEOUT"
      );
    }

    if (error.code === "invalid-argument") {
      return createErrorResponse(
        "Invalid update data provided",
        200,
        "INVALID_UPDATE_DATA"
      );
    }

    // Generic server error
    return createErrorResponse(
      "An unexpected error occurred while updating the customer",
      200,
      "INTERNAL_SERVER_ERROR"
    );
  }
}

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { UpdateUserSchema } from "@/app/schemas/UserSchema/UserSchema";

import { requirePermission } from "@/lib/requirePermission";

// Standardized response helpers
const createSuccessResponse = (data, message = "Success") => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

const createErrorResponse = (message, details = null) => ({
  success: false,
  message,
  error: details,
  timestamp: new Date().toISOString(),
});

// Helper function to transform flat address fields to nested address object
const transformAddressFields = (data) => {
  const addressFields = ["addressLine", "line1", "city", "state", "pincode"];
  const hasAddressFields = addressFields.some((field) =>
    data.hasOwnProperty(field)
  );

  if (!hasAddressFields) {
    return data;
  }

  // Extract address fields
  const address = {};
  const nonAddressData = { ...data };

  // Handle different field name mappings
  if (data.addressLine) {
    address.line1 = data.addressLine;
    delete nonAddressData.addressLine;
  }
  if (data.line1) {
    address.line1 = data.line1;
    delete nonAddressData.line1;
  }
  if (data.city) {
    address.city = data.city;
    delete nonAddressData.city;
  }
  if (data.state) {
    address.state = data.state;
    delete nonAddressData.state;
  }
  if (data.pincode) {
    address.pincode = data.pincode;
    delete nonAddressData.pincode;
  }

  // Only add address object if we have address fields
  if (Object.keys(address).length > 0) {
    nonAddressData.address = address;
  }

  return nonAddressData;
};

// Enhanced uniqueness check with better error handling
const checkFieldUniqueness = async (db, field, value, excludeUserId) => {
  try {
    const query = await db
      .collection("admin_users")
      .where(field, "==", value)
      .limit(2) // Only need to know if there's at least one other user
      .get();

    if (query.empty) {
      return { isUnique: true };
    }

    // Check if the only match is the current user being updated
    const docs = query.docs;
    if (docs.length === 1 && docs[0].id === excludeUserId) {
      return { isUnique: true };
    }

    // Check if all matches are the current user (shouldn't happen but be safe)
    const otherUserExists = docs.some(doc => doc.id !== excludeUserId);
    
    return { 
      isUnique: !otherUserExists,
      conflictUserId: otherUserExists ? docs.find(doc => doc.id !== excludeUserId)?.id : null
    };
    
  } catch (error) {
    console.error(`Error checking ${field} uniqueness:`, {
      field,
      value,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Audit log helper (optional - for tracking user changes)
const logUserUpdate = async (db, userId, updatedFields, updatedBy = 'system') => {
  try {
    await db.collection('audit_logs').add({
      action: 'user_updated',
      targetUserId: userId,
      updatedFields,
      updatedBy,
      timestamp: new Date(),
      metadata: {
        apiEndpoint: '/api/users/update',
        fieldCount: updatedFields.length
      }
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log user update:', error.message);
  }
};

export async function PATCH(req) {
  const startTime = Date.now();
  
  try {
 
    const permissionCheck = await requirePermission(req, "users.update");
    if (permissionCheck) return permissionCheck;

    // Parse request body with enhanced error handling
    let body;
    try {
      const rawBody = await req.text();
      if (!rawBody.trim()) {
        return NextResponse.json(
          createErrorResponse("Request body cannot be empty"),
          { status: 400 }
        );
      }
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return NextResponse.json(
        createErrorResponse("Invalid JSON format in request body"),
        { status: 400 }
      );
    }

    const { userId, ...updateData } = body;

    // Enhanced userId validation
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return NextResponse.json(
        createErrorResponse("Valid userId is required", {
          field: "userId",
          receivedType: typeof userId,
          receivedValue: userId
        }),
        { status: 400 }
      );
    }

    const sanitizedUserId = userId.trim();

    // Check if update data is provided
    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json(
        createErrorResponse("No update data provided"),
        { status: 400 }
      );
    }

    // Transform flat address fields to nested address object
    const transformedUpdateData = transformAddressFields(updateData);

    // Validate update data using schema
    let validatedData;
    try {
      validatedData = UpdateUserSchema.parse(transformedUpdateData);
    } catch (validationError) {
      console.error("Validation error:", {
        userId: sanitizedUserId,
        error: validationError.message,
        timestamp: new Date().toISOString()
      });

      if (validationError instanceof ZodError) {
        const formattedErrors = validationError.errors.map((error) => ({
          field: error.path?.join(".") || "unknown",
          message: error.message || "Validation error",
          receivedValue: error.received,
          expectedType: error.expected
        }));
        
        return NextResponse.json(
          createErrorResponse("Validation failed", {
            validationErrors: formattedErrors,
            totalErrors: formattedErrors.length
          }),
          { status: 400 }
        );
      }

      return NextResponse.json(
        createErrorResponse("Data validation failed", {
          details: validationError?.message || "Unknown validation error"
        }),
        { status: 400 }
      );
    }

    // Initialize Firestore with timeout
    const db = admin.firestore();
    const userRef = db.collection("admin_users").doc(sanitizedUserId);

    // Add timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Update operation timeout')), 30000); // 30 seconds
    });

    const updatePromise = (async () => {
      // Check if user exists
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        return NextResponse.json(
          createErrorResponse("User not found", {
            userId: sanitizedUserId,
            suggestion: "Please verify the user ID and try again"
          }),
          { status: 404 }
        );
      }

      const currentUserData = userSnap.data();

      // Parallel uniqueness checks for better performance
      const uniquenessChecks = [];

      // Check email uniqueness (if email is being updated)
      if (validatedData.email && validatedData.email !== currentUserData.email) {
        uniquenessChecks.push(
          checkFieldUniqueness(db, "email", validatedData.email, sanitizedUserId)
            .then(result => ({ field: "email", ...result }))
        );
      }

      // Check phone uniqueness (if phone is being updated)
      if (validatedData.phone && validatedData.phone !== currentUserData.phone) {
        uniquenessChecks.push(
          checkFieldUniqueness(db, "phone", validatedData.phone, sanitizedUserId)
            .then(result => ({ field: "phone", ...result }))
        );
      }

      // Check alternatePhone uniqueness (if being updated and different from current)
      if (validatedData.alternatePhone && 
          validatedData.alternatePhone !== currentUserData.alternatePhone &&
          validatedData.alternatePhone !== validatedData.phone) { // Also ensure it's different from primary phone
        uniquenessChecks.push(
          checkFieldUniqueness(db, "alternatePhone", validatedData.alternatePhone, sanitizedUserId)
            .then(result => ({ field: "alternatePhone", ...result }))
        );
      }

      // Wait for all uniqueness checks
      if (uniquenessChecks.length > 0) {
        const results = await Promise.all(uniquenessChecks);
        const conflicts = results.filter(result => !result.isUnique);

        if (conflicts.length > 0) {
          const conflictMessages = conflicts.map(conflict => 
            `User with this ${conflict.field} already exists`
          );
          
          return NextResponse.json(
            createErrorResponse("Duplicate data found", {
              conflicts: conflicts.map(conflict => ({
                field: conflict.field,
                message: `${conflict.field} already in use`,
                conflictUserId: conflict.conflictUserId
              }))
            }),
            { status: 409 }
          );
        }
      }

      // Prepare update payload
      let updatePayload = {
        ...validatedData,
        updatedAt: admin.firestore.Timestamp.now(), // Use Firestore timestamp
      };

      // Handle nested address update properly
      if (validatedData.address) {
        const currentAddress = currentUserData.address || {};
        updatePayload.address = {
          ...currentAddress,
          ...validatedData.address,
        };
      }

      // Perform the update
      await userRef.update(updatePayload);

      // Optional: Log the update for audit purposes
      await logUserUpdate(db, sanitizedUserId, Object.keys(validatedData));

      return null; // Success indicator
    })();

    // Race between update operation and timeout
    const result = await Promise.race([updatePromise, timeoutPromise]);
    
    // If result is not null, it's an error response
    if (result !== null) {
      return result;
    }

    const processingTime = Date.now() - startTime;

    // Success response
    return NextResponse.json(
      createSuccessResponse({
        userId: sanitizedUserId,
        updatedFields: Object.keys(validatedData),
        processingTimeMs: processingTime,
        message: "User profile updated successfully"
      }, "User profile updated successfully"),
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Enhanced error logging with context
    const errorContext = {
      message: error.message,
      code: error.code,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
    };

    console.error("Update user API error:", errorContext);

    // Handle timeout specifically
    if (error.message === 'Update operation timeout') {
      return NextResponse.json(
        createErrorResponse("Update operation timed out. Please try again."),
        { status: 504 }
      );
    }

    // Handle Firebase-specific errors
    if (error.code) {
      switch (true) {
        case error.code.includes('permission-denied'):
          return NextResponse.json(
            createErrorResponse("Insufficient permissions to update user"),
            { status: 403 }
          );
          
        case error.code.includes('not-found'):
          return NextResponse.json(
            createErrorResponse("User not found"),
            { status: 404 }
          );
          
        case error.code.includes('unavailable'):
        case error.code.includes('deadline-exceeded'):
          return NextResponse.json(
            createErrorResponse("Database service temporarily unavailable. Please try again later."),
            { status: 503 }
          );
          
        case error.code.includes('resource-exhausted'):
          return NextResponse.json(
            createErrorResponse("Too many update requests. Please try again later."),
            { status: 429 }
          );
          
        case error.code.includes('invalid-argument'):
          return NextResponse.json(
            createErrorResponse("Invalid update parameters."),
            { status: 400 }
          );
      }
    }

    // Generic error response
    return NextResponse.json(
      createErrorResponse(
        "Unable to update user profile at this time. Please try again later.",
        process.env.NODE_ENV === "development" ? { 
          originalError: error.message,
          processingTime: processingTime
        } : null
      ),
      { status: 500 }
    );
  }
}

export const config = {
  runtime: 'nodejs',
};
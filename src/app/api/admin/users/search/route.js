import { NextResponse } from "next/server";
import { z } from "zod";
import admin from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/requirePermission";

const MAX_SEARCH_RESULTS = 50; // Limit results for performance

// Enhanced schema for search input
const SearchSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Search value is required")
    .max(100, "Search value too long") // Prevent abuse
    .refine(
      (val) => val.length >= 2 || /^ADMIN_USER_\d+$/.test(val),
      "Search value must be at least 2 characters (except for user codes)"
    ),
  limit: z.number().int().min(1).max(MAX_SEARCH_RESULTS).optional().default(20),
});

// Enhanced regex patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9+\-()\s]{7,15}$/,
  userCode: /^ADMIN_USER_\d+$/,
};

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

// Data sanitization function
const sanitizeUserData = (user) => ({
  id: user.id,
  userCode: user?.userCode,
  updatedAt: user?.updatedAt?.toDate?.()?.toISOString() || user?.updatedAt,
  twoFactorEnabled: user?.twoFactorEnabled,
  totpVerifiedAt:
    user?.totpVerifiedAt?.toDate?.()?.toISOString() || user?.totpVerifiedAt,
  status: user?.status,
  role: user?.role,
  phone: user?.phone,
  permissions: user?.permissions || [],
  lastInvitationSentAt:
    user?.lastInvitationSentAt?.toDate?.()?.toISOString() ||
    user?.lastInvitationSentAt,
  isInvitationLinkResent: user?.isInvitationLinkResent,
  invitedBy: user?.invitedBy,
  inviteExpiresAt:
    user?.inviteExpiresAt?.toDate?.()?.toISOString() || user?.inviteExpiresAt,
  firebaseAuthUid: user?.firebaseAuthUid,
  email: user?.email,
  department: user?.department,
  dateOfJoining:
    user?.dateOfJoining?.toDate?.()?.toISOString() || user?.dateOfJoining,
  createdAt: user?.createdAt?.toDate?.()?.toISOString() || user?.createdAt,
  alternatePhone: user?.alternatePhone,
  address: user?.address,
  name: user?.name,
});

// Smart field detection
const detectSearchField = (value) => {
  const trimmedValue = value.trim();

  if (patterns.userCode.test(trimmedValue)) {
    return { field: "userCode", searchValue: trimmedValue, exact: true };
  }

  if (patterns.email.test(trimmedValue)) {
    return {
      field: "email",
      searchValue: trimmedValue.toLowerCase(),
      exact: true,
    };
  }

  if (patterns.phone.test(trimmedValue)) {
    // Normalize phone number - remove spaces, dashes, parentheses
    const normalizedPhone = trimmedValue.replace(/[\s\-()]/g, "");
    return { field: "phone", searchValue: normalizedPhone, exact: true };
  }

  return null;
};

// Optimized search function
const performSearch = async (db, field, searchValue, exact, limit) => {
  let results = [];

  try {
    if (exact && field !== "name") {
      // For exact matches, use Firestore queries when possible
      const snapshot = await db
        .collection("admin_users")
        .where(field, "==", searchValue)
        .limit(limit)
        .get();

      results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      // TODO: will implementing Algolia or similar for better text search
      results = [];
    }
  } catch (error) {
    console.error("Search query error:", {
      field,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }

  return results;
};

export async function POST(req) {
  try {
  
    const permissionCheck = await requirePermission(req, "users.access");
    if (permissionCheck) return permissionCheck;

    // Parse and validate request
    let body;
    try {
      const rawBody = await req.json();
      body = SearchSchema.parse(rawBody);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return NextResponse.json(
          createErrorResponse("Invalid JSON format in request body"),
          { status: 400 }
        );
      }

      if (parseError instanceof z.ZodError) {
        const errorMessages = parseError.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");

        return NextResponse.json(
          createErrorResponse("Invalid search parameters", {
            validationErrors: parseError.errors,
            details: errorMessages,
          }),
          { status: 400 }
        );
      }

      throw parseError;
    }

    const { value, limit } = body;

    // Detect search field and prepare search value
    const { field, searchValue, exact } = detectSearchField(value);

    // Input sanitization - prevent potential injection
    if (
      !patterns.email.test(value) &&
      !patterns.phone.test(value) &&
      !patterns.userCode.test(value)
    ) {
      return NextResponse.json(
        createErrorResponse(
          "Invalid search format. Only alphanumeric characters, emails, phones, and user codes are allowed."
        ),
        { status: 400 }
      );
    }

    const db = admin.firestore();

    // Add timeout for search operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Search timeout")), 15000); // 15 seconds
    });

    const searchPromise = performSearch(db, field, searchValue, exact, limit);

    let results;
    try {
      results = await Promise.race([searchPromise, timeoutPromise]);
    } catch (timeoutError) {
      if (timeoutError.message === "Search timeout") {
        return NextResponse.json(
          createErrorResponse(
            "Search operation timed out. Please try a more specific search term."
          ),
          { status: 504 }
        );
      }
      throw timeoutError;
    }

    // Sanitize results
    const sanitizedUsers = results.map(sanitizeUserData);

    const responseData = {
      users: sanitizedUsers,
      searchMeta: {
        query: value,
        detectedField: field,
        searchType: exact ? "exact" : "fuzzy",
        totalFound: sanitizedUsers.length,
        maxResults: limit,
        truncated: field === "name" && sanitizedUsers.length === limit,
      },
    };

    return NextResponse.json(
      createSuccessResponse(
        responseData,
        sanitizedUsers.length > 0
          ? `Found ${sanitizedUsers.length} user${
              sanitizedUsers.length === 1 ? "" : "s"
            }`
          : "No users found matching your search"
      ),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    // Enhanced error logging
    const errorContext = {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get("user-agent"),
    };

    console.error("Search users API error:", errorContext);

    // Handle Firebase-specific errors
    if (error.code) {
      switch (true) {
        case error.code.includes("permission-denied"):
          return NextResponse.json(
            createErrorResponse("Access denied to user data."),
            { status: 403 }
          );

        case error.code.includes("unavailable"):
        case error.code.includes("deadline-exceeded"):
          return NextResponse.json(
            createErrorResponse(
              "Database service is temporarily unavailable. Please try again later."
            ),
            { status: 503 }
          );

        case error.code.includes("resource-exhausted"):
          return NextResponse.json(
            createErrorResponse(
              "Too many search requests. Please try again later."
            ),
            { status: 429 }
          );

        case error.code.includes("invalid-argument"):
          return NextResponse.json(
            createErrorResponse("Invalid search parameters."),
            { status: 400 }
          );
      }
    }

    // Generic error response
    return NextResponse.json(
      createErrorResponse(
        "Unable to complete search at this time. Please try again later.",
        process.env.NODE_ENV === "development"
          ? { originalError: error.message }
          : null
      ),
      { status: 500 }
    );
  }
}

export const config = {
  runtime: "nodejs",
};

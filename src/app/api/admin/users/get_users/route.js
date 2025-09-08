import { NextResponse } from "next/server";
import { z } from "zod";
import admin from "@/lib/firebase-admin";

import { requirePermission } from "@/lib/requirePermission";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

// Zod schema for request validation
const GetUsersSchema = z.object({
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .or(z.string().regex(/^\d+$/).transform(Number))
    .default(DEFAULT_PAGE_SIZE),
  cursor: z
    .string()
    .trim()
    .min(1)
    .max(100) // Reasonable limit for document IDs
    .optional()
    .nullable(),
});

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

export async function POST(req) {
  try {
    // TODO: Add permission check
    const permissionCheck = await requirePermission(req, "users.access");
    if (permissionCheck) return permissionCheck;

    // Parse and validate request body
    let body;
    try {
      const rawBody = await req.json();
      body = GetUsersSchema.parse(rawBody);
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
          createErrorResponse("Invalid request parameters", {
            validationErrors: parseError.errors,
            details: errorMessages,
          }),
          { status: 400 }
        );
      }

      throw parseError;
    }

    const { pageSize, cursor, status, role } = body;

    // Initialize Firestore with timeout
    const db = admin.firestore();

    // Set a reasonable timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 30000); // 30 seconds
    });

    const queryPromise = (async () => {
      // Build base query with consistent ordering
      let query = db
        .collection("admin_users")
        .orderBy("createdAt", "desc")
        .limit(pageSize + 1); // +1 to check if there are more results

      // Handle cursor-based pagination
      if (cursor) {
        try {
          const cursorDoc = await db
            .collection("admin_users")
            .doc(cursor)
            .get();

          if (!cursorDoc.exists) {
            throw new Error("CURSOR_NOT_FOUND");
          }

          query = query.startAfter(cursorDoc);
        } catch (cursorError) {
          if (cursorError.message === "CURSOR_NOT_FOUND") {
            throw new Error("CURSOR_NOT_FOUND");
          }

          console.error("Cursor validation error:", {
            cursor,
            error: cursorError.message,
            timestamp: new Date().toISOString(),
          });

          throw new Error("INVALID_CURSOR");
        }
      }

      return await query.get();
    })();

    // Race between query and timeout
    let snapshot;
    try {
      snapshot = await Promise.race([queryPromise, timeoutPromise]);
    } catch (timeoutError) {
      if (timeoutError.message === "Request timeout") {
        return NextResponse.json(
          createErrorResponse("Request timed out. Please try again."),
          { status: 504 }
        );
      }
      throw timeoutError;
    }

    // Handle empty results
    if (snapshot.empty) {
      return NextResponse.json(
        createSuccessResponse(
          {
            users: [],
            pagination: {
              hasMore: false,
              nextCursor: null,
              pageSize,
              totalReturned: 0,
            },
          },
          "No users found"
        )
      );
    }

    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;

    // Process and sanitize user data
    const users = docs.slice(0, pageSize).map((doc) => {
      const data = doc.data();

      const sanitizedData = {
        id: doc.id,
        userCode: data?.userCode,
        updatedAt:
          data?.updatedAt?.toDate?.()?.toISOString() || data?.updatedAt,
        twoFactorEnabled: data?.twoFactorEnabled,
        totpVerifiedAt:
          data?.totpVerifiedAt?.toDate?.()?.toISOString() ||
          data?.totpVerifiedAt,
        status: data?.status,
        role: data?.role,
        phone: data?.phone,
        permissions: data?.permissions || [],
        lastInvitationSentAt:
          data?.lastInvitationSentAt?.toDate?.()?.toISOString() ||
          data?.lastInvitationSentAt,
        isInvitationLinkResent: data?.isInvitationLinkResent,
        invitedBy: data?.invitedBy,
        inviteExpiresAt:
          data?.inviteExpiresAt?.toDate?.()?.toISOString() ||
          data?.inviteExpiresAt,
        firebaseAuthUid: data?.firebaseAuthUid,
        email: data?.email,
        department: data?.department,
        dateOfJoining:
          data?.dateOfJoining?.toDate?.()?.toISOString() || data?.dateOfJoining,
        createdAt:
          data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
        alternatePhone: data?.alternatePhone,
        address: data?.address,
        name: data?.name,
      };

      return sanitizedData;
    });

    const nextCursor = hasMore ? users[users.length - 1].id : null;

    const responseData = {
      users,
      pagination: {
        hasMore,
        nextCursor,
        pageSize,
        totalReturned: users.length,
      },

      meta: {
        filters: {
          ...(status && { status }),
          ...(role && { role }),
        },
      },
    };

    return NextResponse.json(
      createSuccessResponse(
        responseData,
        `Successfully retrieved ${users.length} users`
      ),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store", // Prevent caching of user data
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (error) {
    // Enhanced error logging with request context
    const errorContext = {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get("user-agent"),
      // Don't log sensitive headers like Authorization
    };

    console.error("Get users API error:", errorContext);

    // Handle specific error types
    if (error.message === "CURSOR_NOT_FOUND") {
      return NextResponse.json(
        createErrorResponse(
          "Invalid pagination cursor. Please refresh and try again."
        ),
        { status: 400 }
      );
    }

    if (error.message === "INVALID_CURSOR") {
      return NextResponse.json(
        createErrorResponse("Malformed pagination cursor."),
        { status: 400 }
      );
    }

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
            createErrorResponse("Too many requests. Please try again later."),
            { status: 429 }
          );

        case error.code.includes("invalid-argument"):
          return NextResponse.json(
            createErrorResponse("Invalid request parameters."),
            { status: 400 }
          );
      }
    }

    // Generic error response - don't leak internal details
    return NextResponse.json(
      createErrorResponse(
        "Unable to retrieve users at this time. Please try again later.",
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

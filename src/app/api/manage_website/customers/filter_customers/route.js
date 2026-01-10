import admin from "@/lib/firebase-admin";
import { z } from "zod";

import { requirePermission } from "@/utils/server/requirePermission";

import {   createSuccessResponse,
  createErrorResponse, } from "@/utils/server/apiResponse";
const db = admin.firestore();

// Valid quick ranges with clear definitions
const QUICK_RANGES = [
  "last7days",
  "last15days",
  "thisMonth",
  "last3months",
  "last6months",
  "thisYear",
];

// Valid filter fields to prevent injection
const VALID_FILTER_FIELDS = [
  "uid",
  "phoneNumber",
  "email",
  "accountStatus",
  "isEmailVerified",
  "isPhoneVerified",
  "gender",
];

// Enhanced Zod schema for request validation
const FilterSchema = z
  .object({
    quickRange: z.enum(QUICK_RANGES).optional(),
    startDate: z
      .string()
      .refine(
        (s) => {
          const date = new Date(s);
          return !isNaN(date.getTime()) && date <= new Date();
        },
        { message: "Invalid start date or future date not allowed" }
      )
      .optional(),
    endDate: z
      .string()
      .refine(
        (s) => {
          const date = new Date(s);
          return !isNaN(date.getTime()) && date <= new Date();
        },
        { message: "Invalid end date or future date not allowed" }
      )
      .optional(),
    extraFilter: z
      .object({
        field: z.enum(VALID_FILTER_FIELDS),
        value: z
          .string()
          .min(1, "Filter value cannot be empty")
          .max(100, "Filter value too long"),
      })
      .optional(),
    limit: z
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(1000, "Limit cannot exceed 1000")
      .optional()
      .default(100),
    offset: z
      .number()
      .int()
      .min(0, "Offset cannot be negative")
      .optional()
      .default(0),
  })
  .refine(
    (data) => {
      // Validate date range logic
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return start <= end;
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["endDate"],
    }
  );

// Enhanced date range calculation with better edge case handling
function getDateRange(quickRange) {
  const now = new Date();
  let start,
    end = new Date(now); // Create new instance for end

  // Set end to end of current day
  end.setHours(23, 59, 59, 999);

  switch (quickRange) {
    case "last7days":
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "last15days":
      start = new Date(now);
      start.setDate(now.getDate() - 15);
      start.setHours(0, 0, 0, 0);
      break;
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last3months":
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      start.setHours(0, 0, 0, 0);
      break;
    case "last6months":
      start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      start.setHours(0, 0, 0, 0);
      break;
    case "thisYear":
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start = null;
  }

  return { start, end };
}

// Helper to sanitize customer data for response (remove sensitive info)
const sanitizeCustomerData = (customer) => {
  const {
    bankDetails,
    paymentMethods,
    internalNotes,
    lastLoginIP,
    ...safeData
  } = customer;

  return safeData;
};

export async function POST(req) {
  const startTime = Date.now();
  let query;
  let snapshot;

  try {
    // Permission check - uncomment and configure based on your permission mapping
    const permissionCheck = await requirePermission(req, "customers.access");
    if (permissionCheck) return permissionCheck;

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON"
      );
    }

    const parsed = FilterSchema.safeParse(body);

    if (!parsed.success) {
      const validationErrors = parsed.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validationErrors
      );
    }

    const { quickRange, startDate, endDate, extraFilter, limit, offset } =
      parsed.data;

    // Validate that only one type of date filter is used
    if (quickRange && (startDate || endDate)) {
      return createErrorResponse(
        "Use either quickRange OR custom dates, not both",
        400,
        "CONFLICTING_DATE_FILTERS"
      );
    }

    let start, end;

    // Calculate date range
    if (quickRange) {
      ({ start, end } = getDateRange(quickRange));
    } else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);

      end.setHours(23, 59, 59, 999);
    }

    // Build Firestore query
    query = db.collection("users");

    // Apply date filtering if provided
    if (start && end) {
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      query = query
        .where("createdAt", ">=", startISO)
        .where("createdAt", "<=", endISO);
    }

    // Apply extra filter at database level for better performance
    if (extraFilter) {
      const { field, value } = extraFilter;
      query = query.where(field, "==", value);
    }

    // Order by creation date for consistent pagination
    query = query.orderBy("createdAt", "desc");

    // Apply pagination
    if (offset > 0) {
      query = query.offset(offset);
    }
    query = query.limit(limit);

    // Execute query with timeout
    const queryPromise = query.get();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), 30000)
    );

    snapshot = await Promise.race([queryPromise, timeoutPromise]);

    // Process results
    let results = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...sanitizeCustomerData(doc.data()),
    }));

    // Calculate total count for pagination (if needed)
    let totalCount = null;
    if (offset === 0 && results.length === limit) {
      // Only calculate total count for first page if we hit the limit
      try {
        const countQuery = extraFilter
          ? db
              .collection("users")
              .where(extraFilter.field, "==", extraFilter.value)
          : db.collection("users");

        if (start && end) {
          const startISO = start.toISOString();
          const endISO = end.toISOString();
          countQuery
            .where("createdAt", ">=", startISO)
            .where("createdAt", "<=", endISO);
        }

        const countSnapshot = await countQuery.count().get();
        totalCount = countSnapshot.data().count;
      } catch (countError) {
        console.warn("Failed to get total count:", countError);
        // Continue without total count
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return createSuccessResponse(
      `Found ${results.length} customers`,
      {
        customers: results,
        pagination: {
          limit,
          offset,
          returned: results.length,
          hasMore: results.length === limit,
          totalCount,
        },
      },
      {
        filters: { quickRange, startDate, endDate, extraFilter },
        executionTimeMs,
        queryOptimized: true,
      }
    );
  } catch (err) {
    console.error("🔥 Error filtering customers:", {
      error: err.message,
      stack: err.stack,
      filters: "not available",
      timestamp: new Date().toISOString(),
      url: req.url,
    });

    // Handle specific Firestore errors
    if (err.code === "permission-denied") {
      return createErrorResponse(
        "Database permission denied",
        403,
        "DATABASE_PERMISSION_DENIED"
      );
    }

    if (err.code === "unavailable" || err.message === "Query timeout") {
      return createErrorResponse(
        "Database service temporarily unavailable",
        503,
        "DATABASE_UNAVAILABLE"
      );
    }

    if (err.code === "invalid-argument") {
      return createErrorResponse(
        "Invalid query parameters",
        400,
        "INVALID_QUERY"
      );
    }

    if (err.code === "resource-exhausted") {
      return createErrorResponse(
        "Query limit exceeded",
        429,
        "QUERY_LIMIT_EXCEEDED"
      );
    }

    // Generic server error
    return createErrorResponse(
      "An unexpected error occurred while filtering customers",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}

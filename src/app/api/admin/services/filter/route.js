import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Valid quick ranges
const QUICK_RANGES = [
  "last7days",
  "last15days",
  "thisMonth",
  "last3months",
  "last6months",
  "thisYear",
];

// Zod schema for request validation
const FilterSchema = z.object({
  quickRange: z.enum(QUICK_RANGES).optional(),
  startDate: z
    .string()
    .refine((s) => !isNaN(new Date(s).getTime()), {
      message: "Invalid start date",
    })
    .optional(),
  endDate: z
    .string()
    .refine((s) => !isNaN(new Date(s).getTime()), {
      message: "Invalid end date",
    })
    .optional(),
  extraFilter: z
    .object({
      field: z.enum([
        "service_booking_id",
        "pay_id",
        "razorpay_order_id",
        "invoiceNumber",
        "service_details.service_id",
        "user_details.uid",
        "user_details.phone",
        "user_details.email",
        "master_status",
      ]),
      value: z.string(),
    })
    .optional(),
});

function getDateRange(quickRange) {
  const now = new Date();
  let start,
    end = now;

  switch (quickRange) {
    case "last7days":
      start = new Date();
      start.setDate(now.getDate() - 7);
      break;
    case "last15days":
      start = new Date();
      start.setDate(now.getDate() - 15);
      break;
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last3months":
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "last6months":
      start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case "thisYear":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = null;
  }
  return { start, end };
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    console.log("Received request body:", body);

    const parsed = FilterSchema.safeParse(body);
    console.log("Zod validation result:", {
      success: parsed.success,
      error: parsed.error,
    });

    if (!parsed.success) {
      console.log("Validation errors:", parsed.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const { quickRange, startDate, endDate, extraFilter } = parsed.data;

    // Validate that only one type of date filter is used
    if (quickRange && (startDate || endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: "Use either quickRange OR custom dates, not both.",
        },
        { status: 400 }
      );
    }

    let start, end;

    if (quickRange) {
      ({ start, end } = getDateRange(quickRange));
    } else if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      // Set end to end of day for inclusive filtering
      end.setHours(23, 59, 59, 999);
    }

    console.log("Date range:", {
      start,
      end,
      startISO: start?.toISOString(),
      endISO: end?.toISOString(),
    });

    // Build optimized Firestore query
    let query = db.collection("service_bookings");

    // Apply date filtering at database level if dates are provided
    if (start && end) {
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      query = query
        .where("created_at", ">=", startISO)
        .where("created_at", "<=", endISO);
    }

    // Apply extra filter at database level for simple fields (non-nested)
    if (extraFilter) {
      const { field, value } = extraFilter;

      // Check if it's a simple field that can be queried directly
      const simpleFields = [
        "service_booking_id",
        "pay_id",
        "razorpay_order_id",
        "invoiceNumber",
        "master_status",
      ];

      if (simpleFields.includes(field)) {
        query = query.where(field, "==", value);
      }
    }

    // Execute the optimized query
    const snapshot = await query.get();

    let results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply nested field filtering in memory (only if needed)
    if (extraFilter) {
      const { field, value } = extraFilter;

      // Handle nested fields that couldn't be filtered at database level
      const nestedFields = [
        "service_details.service_id",
        "user_details.uid",
        "user_details.phone",
        "user_details.email",
      ];

      if (nestedFields.includes(field)) {
        results = results.filter((r) => {
          const fieldParts = field.split(".");
          let current = r;
          for (const part of fieldParts) {
            current = current?.[part];
          }
          return current == value;
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      filters: { quickRange, startDate, endDate, extraFilter },
      resultsCount: results.length,
      bookings: results,
      meta: { executionTimeMs },
    });
  } catch (err) {
    console.error("Service bookings filter API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

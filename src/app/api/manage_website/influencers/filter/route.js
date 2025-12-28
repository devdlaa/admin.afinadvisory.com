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
      field: z.enum(["id", "phone", "email", "lowercase_name"]),
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

    const parsed = FilterSchema.safeParse(body);

    if (!parsed.success) {
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

    // ISO strings can be compared lexicographically for date ordering
    let query = db.collection("influencers");

    if (start && end) {
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      query = query
        .where("createdAt", ">=", startISO)
        .where("createdAt", "<=", endISO);
    }

    // Execute the optimized query
    const snapshot = await query.get();

    let results = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    // Apply extra filter if provided
    if (extraFilter) {
      const { field, value } = extraFilter;
      results = results.filter((r) => r[field] == value);
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      filters: { quickRange, startDate, endDate, extraFilter },
      resultsCount: results.length,
      influncers: results,
      meta: { executionTimeMs },
    });
  } catch (err) {
    console.error("Customer filter API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

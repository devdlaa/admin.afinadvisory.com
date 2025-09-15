import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import { z } from "zod";

const db = admin.firestore();
const { Filter } = admin.firestore; // ✅ Import Filter

// Kill switch from .env
const FEATURE_ENABLED = process.env.ASSIGNMENT_FEATURE_ENABLED === "true";

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
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email.toLowerCase();
    const userRole = session.user.role;

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
      end.setHours(23, 59, 59, 999); // inclusive
    }

    let query = db.collection("service_bookings");

    // ── SuperAdmin OR feature disabled → all documents ──────────
    if (!FEATURE_ENABLED || userRole === "superAdmin") {
      // nothing special, keep full collection
    } else {
      // ── Assignment feature enabled → restricted documents ──────
      query = query.where(
        Filter.or(
          Filter.where("assignmentManagement.assignToAll", "==", true),
          Filter.where("assignedKeys", "array-contains", `email:${userEmail}`)
        )
      );
    }

    // ── Date filter ─────────────────────────────────────────────
    if (start && end) {
      query = query
        .where("created_at", ">=", start.toISOString())
        .where("created_at", "<=", end.toISOString());
    }

    // ── Extra simple field filter ───────────────────────────────
    if (extraFilter) {
      const simpleFields = [
        "service_booking_id",
        "pay_id",
        "razorpay_order_id",
        "invoiceNumber",
        "master_status",
      ];
      if (simpleFields.includes(extraFilter.field)) {
        query = query.where(extraFilter.field, "==", extraFilter.value);
      }
    }

    // ⚡ Fetch in a single query
    const snapshot = await query.get();
    let docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // ── Nested extraFilter handled in memory ─────────────────────
    if (extraFilter) {
      const { field, value } = extraFilter;
      const nestedFields = [
        "service_details.service_id",
        "user_details.uid",
        "user_details.phone",
        "user_details.email",
      ];
      if (nestedFields.includes(field)) {
        docs = docs.filter((r) => {
          const parts = field.split(".");
          let current = r;
          for (const p of parts) current = current?.[p];
          return current == value;
        });
      }
    }

    // Sort by created_at DESC
    docs.sort(
      (a, b) =>
        (new Date(b.created_at).getTime() || 0) -
        (new Date(a.created_at).getTime() || 0)
    );

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      filters: { quickRange, startDate, endDate, extraFilter },
      resultsCount: docs.length,
      bookings: docs,
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

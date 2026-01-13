import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";

const db = admin.firestore();

// Zod schema for input validation
const SearchSchema = z.object({
  value: z.string().min(1, "Search value is required"),
});

function detectField(value) {
  // influencerId (your pattern: influencer_xxxxxxxx)
  if (/^influencer_[A-Za-z0-9]+$/i.test(value)) return "influencerId";

  // service booking id (starts with SBID, then alphanumeric)
  if (/^SBID[0-9A-Za-z]+$/i.test(value)) return "service_booking_id";
  // coupon codes (usually alphanumeric, shortish, maybe prefixed)
  if (/^[A-Za-z0-9_-]{4,20}$/i.test(value)) return "couponCode";

  // customerId (Firestore UID-like: 20+ chars, alphanumeric + - _)
  if (/^[A-Za-z0-9_-]{20,}$/i.test(value)) return "customerId";

  return null; // not recognized
}

export async function POST(req) {
  const [permissionError, session] = await requirePermission(
    req,
    "commissions.access"
  );
  if (permissionError) return permissionError;

  const startTime = Date.now();

  try {
    const body = await req.json();
    const parse = SearchSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    let { value } = parse.data;
    const matchedField = detectField(value);

    if (!matchedField) {
      return NextResponse.json(
        { success: false, error: "Unsupported search format" },
        { status: 400 }
      );
    }

    let commissions = [];

    if (matchedField === "couponCode") {
      value = value.toUpperCase();
      const snap = await db
        .collection("commissions")
        .where("couponCode", "==", value)
        .get();
      commissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "customerId") {
      const snap = await db
        .collection("commissions")
        .where("customerId", "==", value)
        .get();
      commissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "influencerId") {
      value = value.toLowerCase();
      const snap = await db
        .collection("commissions")
        .where("influencerId", "==", value)
        .get();
      commissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "service_booking_id") {
      const snap = await db
        .collection("commissions")
        .where("service_booking_id", "==", value)
        .get();
      commissions = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      commissions = [];
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: commissions.length > 0,
      matchedField,
      queryValue: value,
      resultsCount: commissions.length,
      commissions,
      meta: {
        executionTimeMs,
      },
    });
  } catch (err) {
    console.error("Search commissions API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema for input validation
const SearchSchema = z.object({
  value: z.string().min(1, "Search value is required"),
});

// Detect which field to query based on regex
function detectField(value) {
  if (/^SBID[0-9a-z]+$/i.test(value)) return "service_booking_id";
  if (/^pay_[0-9a-z]+$/i.test(value)) return "pay_id";
  if (/^order_[0-9a-z]+$/i.test(value)) return "razorpay_order_id";
  if (/^AFIN\/INV\/\d{4}\/\d{2}\/\d{4,}$/i.test(value)) return "invoiceNumber";
  return null;
}

export async function POST(req) {
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

    const { value } = parse.data;

    const matchedField = detectField(value);
    if (!matchedField) {
      return NextResponse.json(
        { success: false, error: "Unsupported search format" },
        { status: 500 }
      );
    }

    const querySnap = await db
      .collection("service_bookings")
      .where(matchedField, "==", value)
      .get();

    const bookings = querySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: bookings.length > 0,
      matchedField,
      queryValue: value,
      resultsCount: bookings.length,
      bookings,
      meta: {
        executionTimeMs,
      },
    });
  } catch (err) {
    console.error("Search API error:", err);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

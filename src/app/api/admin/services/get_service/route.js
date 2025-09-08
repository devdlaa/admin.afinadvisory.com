import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema
const Schema = z.object({
  service_booking_id: z.string().min(1, "service_booking_id is required"),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { service_booking_id } = parsed.data;

    // Query Firestore
    const snapshot = await db
      .collection("service_bookings")
      .where("service_booking_id", "==", service_booking_id)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const doc = snapshot.docs[0];
    const booking = { id: doc.id, ...doc.data() };

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (err) {
    console.error("Fetch booking error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

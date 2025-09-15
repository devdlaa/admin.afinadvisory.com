import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import { z } from "zod";

const db = admin.firestore();
const { Filter } = admin.firestore; // ✅ Import Filter

// Kill switch from .env
const FEATURE_ENABLED = process.env.ASSIGNMENT_FEATURE_ENABLED === "true";

// Zod schema
const Schema = z.object({
  service_booking_id: z.string().min(1, "service_booking_id is required"),
});

export async function POST(req) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email.toLowerCase();
    const userRole = session.user.role; // Assuming role is available

    const body = await req.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors },
        { status: 400 }
      );
    }

    const { service_booking_id } = parsed.data;

    let query = db.collection("service_bookings")
      .where("service_booking_id", "==", service_booking_id)
      .limit(1); // only fetch one document

    // ── Apply access control for normal users ─────────────────
    if (FEATURE_ENABLED && userRole !== "superAdmin") {
      query = query.where(
        Filter.or(
          Filter.where("assignmentManagement.assignToAll", "==", true),
          Filter.where("assignedKeys", "array-contains", `email:${userEmail}`)
        )
      );
    }

    const snapshot = await query.get();

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

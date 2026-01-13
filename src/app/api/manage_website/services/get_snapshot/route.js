import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { requirePermission } from "@/utils/server/requirePermission";

// GET /api/admin/booking-stats
export async function GET() {
  try {
    const [permissionError] = await requirePermission(req, "bookings.access");
    if (permissionError) return permissionError;

    const db = admin.firestore();
    const docRef = db
      .collection("service_quick_states")
      .doc("quick_states_service");
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // if no doc, return all 0s
      return NextResponse.json(
        {
          counts: {
            pending: 0,
            processing: 0,
            completed: 0,
            refunds: 0,
            total: 0,
          },
          amounts: {
            pending: 0,
            processing: 0,
            completed: 0,
            refunds: 0,
            total: 0,
          },
          updatedAt: null,
        },
        { status: 200 }
      );
    }

    const data = docSnap.data() || {};

    // ensure safe fallback values even if fields are missing
    return NextResponse.json(
      {
        counts: {
          pending: data?.counts?.pending ?? 0,
          processing: data?.counts?.processing ?? 0,
          completed: data?.counts?.completed ?? 0,
          refunds: data?.counts?.refunds ?? 0,
          total: data?.counts?.total ?? 0,
        },
        amounts: {
          pending: data?.amounts?.pending ?? 0,
          processing: data?.amounts?.processing ?? 0,
          completed: data?.amounts?.completed ?? 0,
          refunds: data?.amounts?.refunds ?? 0,
          total: data?.amounts?.total ?? 0,
        },
        updatedAt: data?.updatedAt ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching booking stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch booking stats",
        counts: {
          pending: 0,
          processing: 0,
          completed: 0,
          refunds: 0,
          total: 0,
        },
        amounts: {
          pending: 0,
          processing: 0,
          completed: 0,
          refunds: 0,
          total: 0,
        },
        updatedAt: null,
      },
      { status: 500 }
    );
  }
}

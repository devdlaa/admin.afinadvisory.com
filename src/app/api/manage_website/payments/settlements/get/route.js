import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/utils/server/requirePermission";
// Default pagination
const DEFAULT_COUNT = 10;
const DEFAULT_SKIP = 0;

export async function POST(req) {
  try {
     // Permission check placeholder
        const permissionCheck = await requirePermission(req, "payments.access");
        if (permissionCheck) return permissionCheck;
    const body = await req.json();
    const count = parseInt(body.count) || DEFAULT_COUNT;
    const skip = parseInt(body.skip) || DEFAULT_SKIP;

    // Fetch settlements with pagination
    const settlements = await razorpay.settlements.all({ count, skip });

    return NextResponse.json(
      {
        success: true,
        message: "Settlements fetched successfully",
        data: settlements,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching settlements:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch settlements",
        data: null,
      },
      { status: err.statusCode || 500 }
    );
  }
}

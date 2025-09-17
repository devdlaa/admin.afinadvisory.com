import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
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

    // Fetch refunds with pagination
    const refunds = await razorpay.refunds.all({ count, skip });

    return NextResponse.json(
      {
        success: true,
        message: "Refunds fetched successfully",
        data: refunds,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching refunds:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch refunds",
        data: null,
      },
      { status: err.statusCode || 500 }
    );
  }
}

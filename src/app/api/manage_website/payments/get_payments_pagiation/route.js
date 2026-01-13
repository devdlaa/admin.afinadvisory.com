import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/utils/server/requirePermission";
// Default pagination
const DEFAULT_COUNT = 10;
const DEFAULT_SKIP = 0;

export async function POST(req) {
  try {
    const [permissionError] = await requirePermission(req, "payments.access");
    if (permissionError) return permissionError;
    const body = await req.json();
    const count = parseInt(body.count) || DEFAULT_COUNT;
    const skip = parseInt(body.skip) || DEFAULT_SKIP;

    // Fetch all payments with pagination
    const payments = await razorpay.payments.all({ count, skip });

    return NextResponse.json(
      {
        success: true,
        message: "Payments fetched successfully",
        data: payments,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error fetching payments:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to fetch payments",
        data: null,
      },
      { status: err.statusCode || 500 }
    );
  }
}

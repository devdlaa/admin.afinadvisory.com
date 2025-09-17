import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/requirePermission";
export async function POST(req) {
  try {
     // Permission check placeholder
        const permissionCheck = await requirePermission(req, "payments.access");
        if (permissionCheck) return permissionCheck;
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        message: "Settlement ID is required",
        data: null,
      }, { status: 400 });
    }

    // Fetch settlement details using Razorpay Node SDK
    const settlement = await razorpay.settlements.fetch(id);

    return NextResponse.json({
      success: true,
      message: "Settlement details fetched successfully",
      data: settlement,
    }, { status: 200 });
  } catch (err) {
    console.error("Error fetching settlement details:", err);
    return NextResponse.json({
      success: false,
      message: err.message || "Failed to fetch settlement details",
      data: null,
    }, { status: err.statusCode || 500 });
  }
}

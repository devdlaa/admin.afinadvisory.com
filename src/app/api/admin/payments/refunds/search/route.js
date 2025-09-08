import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";

// Default pagination
const DEFAULT_COUNT = 10;
const DEFAULT_SKIP = 0;

export async function POST(req) {
  try {
    const body = await req.json();
    const count = parseInt(body.count) || DEFAULT_COUNT;
    const skip = parseInt(body.skip) || DEFAULT_SKIP;
    const payment_id = body.payment_id;
    const order_id = body.order_id;

    let refunds;

    // Fetch refunds by payment_id
    if (payment_id) {
      refunds = await razorpay.refunds.all({ payment_id, count, skip });
    } 
    // Fetch refunds by order_id
    else if (order_id) {
      refunds = await razorpay.refunds.all({ order_id, count, skip });
    } 
    // If neither is provided, return empty
    else {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide payment_id or order_id",
          data: null,
        },
        { status: 400 }
      );
    }

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

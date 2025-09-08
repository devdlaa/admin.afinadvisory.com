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
    const from = parseInt(body.from); // UNIX timestamp in seconds
    const to = parseInt(body.to); // UNIX timestamp in seconds

    // Build query
    const query = { count, skip };
    if (!isNaN(from)) query.from = from;
    if (!isNaN(to)) query.to = to;

    // Fetch settlements from Razorpay
    const settlements = await razorpay.settlements.all(query);

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

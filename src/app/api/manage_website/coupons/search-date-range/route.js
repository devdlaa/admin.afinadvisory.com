import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coupon from "@/schemas/coupons/Coupon";

export async function POST(req) {
  try {
    await connectToDatabase();

    const { startDate, endDate } = await req.json();

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: "Start date cannot be after end date" },
        { status: 400 }
      );
    }

    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    // Search coupons by creation date range
    const coupons = await Coupon.find({
      createdAt: {
        $gte: start,
        $lte: end,
      },
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: coupons,
      startDate,
      endDate,
      count: coupons.length,
    });
  } catch (err) {
    console.error("🔥 Date range search error:", err);
    return NextResponse.json(
      { error: "Date range search failed" },
      { status: 500 }
    );
  }
}

// /api/admin/coupons/get_coupon/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coupon from "@/schemas/coupons/Coupon";
import mongoose from "mongoose";
import { requirePermission } from "@/utils/server/requirePermission";
export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req, "coupons.access");
    if (permissionError) return permissionError;

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid or missing coupon ID" },
        { status: 400 }
      );
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon }, { status: 200 });
  } catch (err) {
    console.error("🔥 Error fetching coupon:", err);
    return NextResponse.json(
      { error: "Failed to fetch coupon" },
      { status: 500 }
    );
  }
}

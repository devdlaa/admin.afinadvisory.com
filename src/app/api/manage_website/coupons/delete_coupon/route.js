import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coupon from "@/schemas/coupons/Coupon";
import mongoose from "mongoose";
import { z } from "zod";

import { requirePermission } from "@/utils/server/requirePermission";
const deleteCouponSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "Coupon ID is required")
    .refine(
      (val) => mongoose.Types.ObjectId.isValid(val),
      "Invalid coupon ID format"
    ),
});

export async function DELETE(req) {
  try {
    // Permission check placeholder
    const permissionCheck = await requirePermission(req, "coupons.delete");
    if (permissionCheck) return permissionCheck;

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const validation = deleteCouponSchema.safeParse({ id });
    if (!validation.success) {
      const errors = validation.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          details: errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const couponId = validation.data.id;

    // Check if coupon exists before deletion
    const existingCoupon = await Coupon.findById(couponId).lean();
    if (!existingCoupon) {
      return NextResponse.json(
        {
          success: false,
          error: "Coupon not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // You might want to prevent deletion of active coupons with usage
    if (
      existingCoupon.state === "active" &&
      existingCoupon.usageStats?.used > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete active coupon with existing usage. Consider deactivating instead.",
          timestamp: new Date().toISOString(),
        },
        { status: 409 }
      );
    }

    // Perform the deletion
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

    // Log the deletion for audit purposes
    console.log(
      `🗑️  Coupon deleted: ${deletedCoupon.code} (${deletedCoupon._id})`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Coupon "${existingCoupon.code}" deleted successfully`,
        data: {
          deletedCoupon: {
            id: deletedCoupon._id,
            code: deletedCoupon.code,
            title: deletedCoupon.title,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("🔥 Error deleting coupon:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete coupon. Please try again later.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

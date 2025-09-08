import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/utils/mongodb";
import Coupon from "@/models/Coupon";

// Zod schema for request validation
const ValidateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  customerId: z.string().optional(),
  serviceId: z.string().optional(),
});

export async function POST(req) {
  try {
    const json = await req.json();

    // Validate input
    const parsed = ValidateCouponSchema.safeParse(json);

    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, message: `Invalid input: ${errorMsg}` },
        { status: 400 }
      );
    }

    const { code, customerId, serviceId } = parsed.data;

    await connectToDatabase();

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    if (coupon.state !== "active") {
      return NextResponse.json(
        { success: false, message: "Coupon is not active" },
        { status: 400 }
      );
    }

    const now = new Date();

    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return NextResponse.json(
        { success: false, message: "Coupon is not yet valid" },
        { status: 400 }
      );
    }

    if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
      return NextResponse.json(
        { success: false, message: "Coupon has expired" },
        { status: 400 }
      );
    }

    if (coupon.linkedServices?.length && serviceId) {
      const allowed = coupon.linkedServices.includes(serviceId);
      if (!allowed) {
        return NextResponse.json(
          { success: false, message: "Coupon not valid for this service" },
          { status: 400 }
        );
      }
    }

    if (coupon.linkedCustomers?.length) {
      const allowed = coupon.linkedCustomers.includes(customerId);
      if (!allowed) {
        return NextResponse.json(
          { success: false, message: "Coupon not valid for this customer" },
          { status: 400 }
        );
      }
    }

    if (coupon.usageLimits?.perUser) {
      const usageCount =
        coupon.usedBy?.filter((u) => u === customerId).length || 0;
      if (usageCount >= coupon.usageLimits.perUser) {
        return NextResponse.json(
          {
            success: false,
            message: "Usage limit reached for this customer",
          },
          { status: 400 }
        );
      }
    }

    if (
      coupon.usageLimits?.total &&
      coupon.totalUsed >= coupon.usageLimits.total
    ) {
      return NextResponse.json(
        { success: false, message: "Coupon usage limit reached" },
        { status: 400 }
      );
    }

    // ✅ Success — minimal return
    return NextResponse.json({
      success: true,
      message: "Coupon is valid",
      code: coupon.code,
      coupon_id: coupon?._id?.toString?.() || "No ID",
      discount: coupon.discount,
      ...(coupon.isInfluencerCoupon && coupon.influencerId
        ? { influencerId: coupon.influencerId }
        : {}),
    });
  } catch (err) {
    console.error("🔥 Coupon validation error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Server error validating coupon",
      },
      { status: 500 }
    );
  }
}

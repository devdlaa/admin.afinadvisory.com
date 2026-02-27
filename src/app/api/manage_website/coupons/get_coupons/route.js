import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coupon from "@/schemas/coupons/Coupon";
import { z } from "zod";

import { requirePermission } from "@/utils/server/requirePermission";

const getCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.enum(["active", "expired", "inactive", "usedUp"]).optional(),
  code: z.string().trim().max(50).optional(),
  isInfluencerCoupon: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  influencerId: z.string().trim().max(100).optional(),
  serviceId: z.string().trim().max(100).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "code", "expiresAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req, "coupons.access");
    if (permissionError) return permissionError;

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = getCouponsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors = validation.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      state,
      code,
      isInfluencerCoupon,
      influencerId,
      serviceId,
      sortBy,
      sortOrder,
    } = validation.data;
    const skip = (page - 1) * limit;

    // Build filters
    const filters = {};
    if (state) filters.state = state;
    if (code) filters.code = { $regex: code, $options: "i" };
    if (typeof isInfluencerCoupon === "boolean")
      filters.isInfluencerCoupon = isInfluencerCoupon;
    if (influencerId) filters.influencerId = influencerId;
    if (serviceId) filters.linkedServices = serviceId;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [coupons, total] = await Promise.all([
      Coupon.find(filters)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select("-__v") // Exclude version field
        .lean(), // Better performance
      Coupon.countDocuments(filters),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: `Found ${total} coupon(s)`,
        data: {
          coupons,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
          filters: Object.keys(filters).length > 0 ? filters : null,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(" Error fetching coupons:");
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch coupons. Please try again later.",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

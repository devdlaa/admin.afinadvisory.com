import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coupon from "@/schemas/coupons/Coupon";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";

const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Only A-Z, 0-9, _ or - allowed"),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),

  discount: z.object({
    kind: z.enum(["flat", "percent"]),
    amount: z.number().positive(),
    maxDiscount: z.number().positive().optional(),
  }),
  linkedServices: z.array(z.string()).optional(),
  linkedCustomers: z.array(z.string()).optional(),

  appliesTo: z
    .object({
      users: z.enum(["all", "new"]),
    })
    .optional(),

  usageLimits: z
    .object({
      perUser: z.number().positive().optional(),
      total: z.number().positive().optional(),
    })
    .optional(),

  validFrom: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),

  state: z.enum(["active", "expired", "inactive", "usedUp"]).optional(),

  isInfluencerCoupon: z.boolean().optional(),
  influencerId: z.string().optional(),

  commission: z
    .object({
      kind: z.enum(["fixed", "percent"]),
      amount: z.number().positive(),
      maxCommission: z.number().positive().optional(),
    })
    .optional(),

  createdBy: z.string().optional(),
});

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(req, "coupons.create");
    if (permissionCheck) return permissionCheck;

    await connectToDatabase();

    const body = await req.json();

    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
      console.warn("⚠️ Zod validation failed:", errorDetails);
      return NextResponse.json(
        { error: "Validation failed", details: errorDetails },
        { status: 400 }
      );
    }

    const cleanedData = {
      ...parsed.data,
    };

    const existing = await Coupon.findOne({ code: cleanedData.code });
    if (existing) {
      console.warn(`⚠️ Coupon with code ${cleanedData.code} already exists`);
      return NextResponse.json(
        { error: `Coupon code "${cleanedData.code}" already exists.` },
        { status: 409 }
      );
    }

    const newCoupon = await Coupon.create(cleanedData);

    return NextResponse.json(
      { success: true, coupon: newCoupon },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Server error while creating coupon. Please try again later." },
      { status: 500 }
    );
  }
}

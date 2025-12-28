import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Coupon from "@/schemas/coupons/Coupon";
import mongoose from "mongoose";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";
const couponUpdateSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),

  discount: z
    .object({
      kind: z.enum(["flat", "percent"]),
      amount: z.number().positive(),
      maxDiscount: z.number().positive().optional(),
    })
    .optional(),

  addLinkedServices: z.array(z.string()).optional(),
  removeLinkedServices: z.array(z.string()).optional(),
  clearLinkedServices: z.boolean().optional(),

  addLinkedCustomers: z.array(z.string()).optional(),
  removeLinkedCustomers: z.array(z.string()).optional(),
  clearLinkedCustomers: z.boolean().optional(),

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
  influencerId: z.string().nullable().optional(),
  commission: z
    .object({
      kind: z.enum(["fixed", "percent"]),
      amount: z.number().positive(),
      maxCommission: z.number().positive().optional(),
    })
    .nullable()
    .optional(),

  updatedAt: z.coerce.date().optional(),
  createdBy: z.string().optional(),
});

export async function PATCH(req, context) {
  try {
    const permissionCheck = await requirePermission(req, "coupons.update");
    if (permissionCheck) return permissionCheck;
    await connectToDatabase();
    const { id } = context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon ID" }, { status: 400 });
    }

    const body = await req.json();

    const parsed = couponUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const {
      addLinkedServices,
      removeLinkedServices,
      clearLinkedServices,
      addLinkedCustomers,
      removeLinkedCustomers,
      clearLinkedCustomers,
      ...rest
    } = parsed.data;

    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    // ---- Linked Services ----
    if (clearLinkedServices) {
      rest.linkedServices = [];
    } else {
      const current = existingCoupon.linkedServices || [];
      const add = new Set(addLinkedServices || []);
      const remove = new Set(removeLinkedServices || []);
      rest.linkedServices = [
        ...new Set([...current.filter((sid) => !remove.has(sid)), ...add]),
      ];
    }

    // ---- Linked Customers ----
    if (clearLinkedCustomers) {
      rest.linkedCustomers = [];
    } else {
      const current = existingCoupon.linkedCustomers || [];
      const add = new Set(addLinkedCustomers || []);
      const remove = new Set(removeLinkedCustomers || []);
      rest.linkedCustomers = [
        ...new Set([...current.filter((cid) => !remove.has(cid)), ...add]),
      ];
    }

    // Timestamp
    rest.updatedAt = new Date();

    const update = { $set: {}, $unset: {} };

    // Prepare $set and $unset safely
    for (const [key, value] of Object.entries(rest)) {
      if (value === null) {
        update.$unset[key] = "";
      } else {
        update.$set[key] = value;
      }
    }

    // Special null handling from original body
    if (body.influencerId === null) {
      update.$unset.influencerId = "";
      delete update.$set.influencerId;
    }

    if (body.commission === null) {
      update.$unset.commission = "";
      delete update.$set.commission;
    }

    // Remove $unset if empty
    if (Object.keys(update.$unset).length === 0) delete update.$unset;

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, update, {
      new: true,
    });

    return NextResponse.json(
      { success: true, coupon: updatedCoupon },
      { status: 200 }
    );
  } catch (err) {
    console.error("🔥 Server error:", err.stack || err.message);
    return NextResponse.json(
      { error: "Server error while updating coupon. Please try again later." },
      { status: 500 }
    );
  }
}

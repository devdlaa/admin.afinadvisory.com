import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";
import { auth } from "@/utils/server/auth";
const db = admin.firestore();
import { requirePermission } from "@/utils/server/requirePermission";
const UpdateSchema = z.object({
  actionType: z.enum(["markPaid", "markUnpaid"]),
  ids: z.array(z.string().min(1)).min(1),
});

export async function POST(req) {
  const session = await auth();
  const startTime = Date.now();

  try {
    // Permission check placeholder
    const permissionCheck = await requirePermission(req, "commissions.update_paid_status");
    if (permissionCheck) return permissionCheck;

    const body = await req.json();
    const parse = UpdateSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { actionType, ids } = parse.data;

    const isPaid = actionType === "markPaid";
    const now = admin.firestore.Timestamp.now();

    const currentUser = session?.user?.id;

    const batch = db.batch();
    const updatedIds = [];
    const skippedIds = [];

    for (const id of ids) {
      const ref = db.collection("commissions").doc(id);
      const snap = await ref.get();

      if (!snap.exists) {
        skippedIds.push(id);
        continue;
      }

      const data = snap.data();
      if (data.status === (isPaid ? "paid" : "unpaid")) {
        skippedIds.push(id);
        continue;
      }

      const updateData = {
        status: isPaid ? "paid" : "unpaid",
        updatedAt: now,
        paidAt: isPaid ? now : null,
        paidBy: isPaid ? currentUser : null,
      };

      batch.update(ref, updateData);
      updatedIds.push(id);
    }

    if (updatedIds.length > 0) {
      await batch.commit();
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      actionType,
      updatedCount: updatedIds.length,
      skippedCount: skippedIds.length,
      updatedIds,
      skippedIds,
      newStatus: isPaid ? "paid" : "unpaid",
      meta: { executionTimeMs },
    });
  } catch (err) {
    console.error("Update commissions status API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

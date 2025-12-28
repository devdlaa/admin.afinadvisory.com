import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";
const db = admin.firestore();

// Zod schema for pagination input
const PaginationSchema = z.object({
  limit: z.number().int().positive().max(50).default(10),
  cursor: z.string().optional(),
});

export async function POST(req) {
  const startTime = Date.now();

  try {
            // Permission check placeholder
    const permissionCheck = await requirePermission(
      req,
      "payment_link.access"
    );
    if (permissionCheck) return permissionCheck;

    const body = await req.json();
    const parse = PaginationSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, cursor } = parse.data;

    let query = db
      .collection("payment_links")
      .orderBy("created_at", "desc")
      .limit(limit + 1);

    // If cursor provided → start after that doc
    if (cursor) {
      const lastDocSnap = await db
        .collection("payment_links")
        .doc(cursor)
        .get();
      if (lastDocSnap.exists) {
        query = query.startAfter(lastDocSnap);
      }
    }

    const snap = await query.get();

    // Extract docs
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // hasMore = if we fetched more than limit
    const hasMore = docs.length > limit;
    const payment_links = hasMore ? docs.slice(0, limit) : docs;

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      resultsCount: payment_links.length,
      payment_links,
      hasMore,
      cursor: payment_links.length ? payment_links[payment_links.length - 1].id : null,
      meta: {
        executionTimeMs,
        requestedLimit: limit,
      },
    });
  } catch (err) {
    console.error("Get Payment Links API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

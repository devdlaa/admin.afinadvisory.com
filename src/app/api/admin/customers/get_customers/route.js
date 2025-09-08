import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema for pagination input
const PaginationSchema = z.object({
  limit: z.number().int().positive().max(50).default(10),
  cursor: z.string().optional(), // last doc id
});

export async function POST(req) {
  const startTime = Date.now();

  try {
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
      .collection("users")
      .orderBy("createdAt", "desc")
      .limit(limit + 1);

    if (cursor) {
      const lastDocSnap = await db.collection("users").doc(cursor).get();
      if (lastDocSnap.exists) {
        query = query.startAfter(lastDocSnap);
      }
    }

    const snap = await query.get();

    const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const hasMore = docs.length > limit;
    const customers = hasMore ? docs.slice(0, limit) : docs;

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      resultsCount: customers.length,
      customers,
      hasMore,
      cursor: customers.length ? customers[customers.length - 1].id : null,
      meta: {
        executionTimeMs,
        requestedLimit: limit,
      },
    });
  } catch (err) {
    console.error("Get customers API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

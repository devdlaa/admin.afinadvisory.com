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
      .collection("service_bookings")
      .orderBy("created_at", "desc")
      .limit(limit + 1);

    // If cursor provided → start after that doc
    if (cursor) {
      const lastDocSnap = await db
        .collection("service_bookings")
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
    const bookings = hasMore ? docs.slice(0, limit) : docs;

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      resultsCount: bookings.length,
      bookings,
      hasMore,
      cursor: bookings.length ? bookings[bookings.length - 1].id : null, // send new cursor
      meta: {
        executionTimeMs,
        requestedLimit: limit,
      },
    });
  } catch (err) {
    console.error("Get services API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

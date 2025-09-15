import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import { z } from "zod";

const db = admin.firestore();

// ── Kill switch from .env ──────────────────────────────
// .env example: ASSIGNMENT_FEATURE_ENABLED=true
const FEATURE_ENABLED =
  process.env.ASSIGNMENT_FEATURE_ENABLED === "true";

// Zod schema for pagination
const PaginationSchema = z.object({
  limit: z.number().int().positive().max(50).default(10),
  cursor: z.string().optional(), // last doc id
});

export async function POST(req) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email.toLowerCase();
    const userRole = session.user.role; 
 
    const body = await req.json();
    const parse = PaginationSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, cursor } = parse.data;

    // Base query with pagination
    const baseQuery = (l, c) => {
      let q = db
        .collection("service_bookings")
        .orderBy("created_at", "desc")
        .limit(l + 1); // +1 to check if there is more
      if (c) {
        q = q.startAfter(db.collection("service_bookings").doc(c));
      }
      return q;
    };

    // If assignment feature is disabled OR user is SuperAdmin → return *all* bookings
    if (!FEATURE_ENABLED || userRole === "superAdmin") {
      const snap = await baseQuery(limit, cursor).get();
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const hasMore = docs.length > limit;
      const bookings = hasMore ? docs.slice(0, limit) : docs;

      return NextResponse.json({
        success: true,
        featureDisabled: true,
        resultsCount: bookings.length,
        bookings,
        hasMore,
        cursor: bookings.length ? bookings[bookings.length - 1].id : null,
        meta: {
          executionTimeMs: Date.now() - startTime,
          requestedLimit: limit,
        },
      });
    }

    // ── Assignment feature ENABLED for regular users ──────────────
    // Run both queries in parallel
    const [snapAll, snapUser] = await Promise.all([
      baseQuery(limit, cursor)
        .where("assignmentManagement.assignToAll", "==", true)
        .get(),
      baseQuery(limit, cursor)
        .where("assignedKeys", "array-contains", `email:${userEmail}`)
        .get(),
    ]);

    // Merge and deduplicate
    const allDocs = [...snapAll.docs, ...snapUser.docs];

    const map = new Map();
    for (const d of allDocs) map.set(d.id, { id: d.id, ...d.data() });
    const mergedDocs = Array.from(map.values());

    // Sort by created_at DESC (because we merged)
    mergedDocs.sort(
      (a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)
    );

    const hasMore = mergedDocs.length > limit;
    const bookings = hasMore ? mergedDocs.slice(0, limit) : mergedDocs;

    return NextResponse.json({
      success: true,
      resultsCount: bookings.length,
      bookings,
      hasMore,
      cursor: bookings.length ? bookings[bookings.length - 1].id : null,
      meta: {
        executionTimeMs: Date.now() - startTime,
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

import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";

import { z } from "zod";
import { requirePermission } from "@/utils/server/requirePermission";

const db = admin.firestore();

// ── Kill switch from .env ──────────────────────────────
const FEATURE_ENABLED = process.env.ASSIGNMENT_FEATURE_ENABLED === "true";

// Zod schema for pagination
const PaginationSchema = z.object({
  limit: z.number().int().positive().max(50).default(10),
  cursor: z.string().optional(), // last doc id
});

export async function POST(req) {
  const startTime = Date.now();

  try {
    const [permissionError, session] = await requirePermission(
      req,
      "bookings.access"
    );
    if (permissionError) return permissionError;
    const userCode = session.user.user_code;

    const userRole = session.user.admin_role;

    const body = await req.json();
    const parse = PaginationSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { limit, cursor } = parse.data;

    // Helper function to apply cursor to query
    const applyCursor = async (query, cursorDocId) => {
      if (cursorDocId) {
        const lastDocSnap = await db
          .collection("service_bookings")
          .doc(cursorDocId)
          .get();

        if (lastDocSnap.exists) {
          return query.startAfter(lastDocSnap);
        }
      }
      return query;
    };

    const collectionRef = db.collection("service_bookings");

    // If assignment feature is disabled OR user is SUPER_ADMIN → return *all* bookings
    if (!FEATURE_ENABLED || userRole === "SUPER_ADMIN") {
      let query = collectionRef.orderBy("created_at", "desc").limit(limit + 1);

      query = await applyCursor(query, cursor);

      const snap = await query.get();
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
    const queryLimit = limit;
    const assignedKeysLookup = ["all"];
    if (userCode) {
      assignedKeysLookup.push(`userCode:${userCode}`);
    }

    let query = collectionRef
      .where("assignedKeys", "array-contains-any", assignedKeysLookup)
      .orderBy("created_at", "desc")
      .limit(limit + 1);

    // Apply cursor to both queries
    query = await applyCursor(query, cursor);

    const snap = await query.get();

    // Merge and deduplicate
    const allDocs = [...snap.docs];
    const docMap = new Map();

    for (const doc of allDocs) {
      if (!docMap.has(doc.id)) {
        docMap.set(doc.id, { id: doc.id, ...doc.data() });
      }
    }

    // Convert to array and sort by created_at DESC
    const mergedDocs = Array.from(docMap.values());
    mergedDocs.sort((a, b) => {
      const aTime = a.created_at?.seconds || 0;
      const bTime = b.created_at?.seconds || 0;
      return bTime - aTime;
    });

    // Apply pagination to merged results
    const hasMore = mergedDocs.length > limit;
    const bookings = mergedDocs.slice(0, limit);

    return NextResponse.json({
      success: true,
      resultsCount: bookings.length,
      bookings,
      hasMore: hasMore || snap.docs.length >= queryLimit,
      cursor: bookings.length ? bookings[bookings.length - 1].id : null,
      meta: {
        executionTimeMs: Date.now() - startTime,
        requestedLimit: limit,
        mergedResults: mergedDocs.length,
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

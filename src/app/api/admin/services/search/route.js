import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import { z } from "zod";

const db = admin.firestore();

// Kill switch from .env
const FEATURE_ENABLED = process.env.ASSIGNMENT_FEATURE_ENABLED === "true";

// Zod schema for input validation
const SearchSchema = z.object({
  value: z.string().min(1, "Search value is required"),
});

// Detect which field to query based on regex
function detectField(value) {
  if (/^SBID[0-9a-z]+$/i.test(value)) return "service_booking_id";
  if (/^pay_[0-9a-z]+$/i.test(value)) return "pay_id";
  if (/^order_[0-9a-z]+$/i.test(value)) return "razorpay_order_id";
  if (/^AFIN\/INV\/\d{4}\/\d{2}\/\d{4,}$/i.test(value)) return "invoiceNumber";
  return null;
}

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
    const parse = SearchSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { value } = parse.data;
    const matchedField = detectField(value);

    if (!matchedField) {
      return NextResponse.json(
        { success: false, error: "Unsupported search format" },
        { status: 400 }
      );
    }

    let docs = [];

    // Kill switch / SuperAdmin: return all matching bookings
    if (!FEATURE_ENABLED || userRole === "superAdmin") {
      const snapshot = await db
        .collection("service_bookings")
        .where(matchedField, "==", value)
        .get();
      
      docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      // Assignment feature enabled for normal users
      // Get all matching documents first, then filter in memory
      const allMatchingDocs = await db
        .collection("service_bookings")
        .where(matchedField, "==", value)
        .get();

      // Filter based on access control
      docs = allMatchingDocs.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((doc) => {
          const assignToAll = doc.assignmentManagement?.assignToAll === true;
          const assignedToUser = doc.assignedKeys?.includes(`email:${userEmail}`);
          return assignToAll || assignedToUser;
        });
    }

    // Sort by created_at DESC (handle Firestore timestamps properly)
    docs.sort((a, b) => {
      const aTime = a.created_at?.seconds || 0;
      const bTime = b.created_at?.seconds || 0;
      return bTime - aTime;
    });

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: docs.length > 0,
      matchedField,
      queryValue: value,
      resultsCount: docs.length,
      bookings: docs,
      meta: { 
        executionTimeMs,
        accessControlEnabled: FEATURE_ENABLED && userRole !== "superAdmin"
      },
    });
    
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
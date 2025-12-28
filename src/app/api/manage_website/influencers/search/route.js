import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema for input validation
const SearchSchema = z.object({
  value: z.string().min(1, "Search value is required"),
});
function detectField(value) {
  if (/^\+?\d{7,15}$/.test(value)) return "phone";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";

  if (/^influencer_[A-Za-z0-9]+$/.test(value)) return "id";

  return "name";
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const parse = SearchSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    let { value } = parse.data;
    const matchedField = detectField(value);

    if (!matchedField) {
      return NextResponse.json(
        { success: false, error: "Unsupported search format" },
        { status: 400 }
      );
    }

    let influencers = [];
    console.log("matchedField", matchedField);
    if (matchedField === "id") {
      const doc = await db.collection("influencers").doc(value).get();
      if (doc.exists) influencers.push({ id: doc.id, ...doc.data() });
    } else if (matchedField === "email") {
      value = value.toLowerCase(); // normalize email
      const snap = await db
        .collection("influencers")
        .where("email", "==", value)
        .get();
      influencers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "phone") {
      const snap = await db
        .collection("influencers")
        .where("phone", "==", value)
        .get();
      influencers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "name") {
      influencers = [];
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: influencers.length > 0,
      matchedField,
      queryValue: value,
      resultsCount: influencers.length,
      influencers,
      meta: {
        executionTimeMs,
      },
    });
  } catch (err) {
    console.error("Search customers API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

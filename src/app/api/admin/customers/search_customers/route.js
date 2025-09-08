import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema for input validation
const SearchSchema = z.object({
  value: z.string().min(1, "Search value is required"),
});

function detectField(value) {
  if (/^\+?\d{7,15}$/.test(value)) return "phoneNumber"; // phone number first
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email"; // email
  if (/^[A-Za-z0-9_-]{10,}$/i.test(value)) return "uid"; // Firestore doc id
  return null; // no name search for now
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

    let customers = [];

    if (matchedField === "uid") {
      const doc = await db.collection("users").doc(value).get();
      if (doc.exists) customers.push({ id: doc.id, ...doc.data() });
    } else if (matchedField === "email") {
      value = value.toLowerCase(); // normalize email
      const snap = await db
        .collection("users")
        .where("email", "==", value)
        .get();
      customers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else if (matchedField === "phoneNumber") {
      const snap = await db
        .collection("users")
        .where("phoneNumber", "==", value)
        .get();
      customers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: customers.length > 0,
      matchedField,
      queryValue: value,
      resultsCount: customers.length,
      customers,
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

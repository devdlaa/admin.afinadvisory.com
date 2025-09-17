import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { z } from "zod";

const db = admin.firestore();

// Zod schema for email input
const EmailSchema = z.object({
  email: z.string().email(),
});

export async function POST(req) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const parse = EmailSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { success: false, error: parse.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parse.data;

    // ✅ Use lowercase email to match stored field
    const querySnap = await db
      .collection("influencers")
      .where("lowercase_email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (querySnap.empty) {
      return NextResponse.json(
        { success: false, message: "Influencer not found" },
        { status: 404 }
      );
    }

    const doc = querySnap.docs[0];
    const data = doc.data();

    const influencer = {
      id: doc.id,
      email: data.email,
      name: data.name,
      status: data.status,
    };

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      influencer,
      meta: { executionTimeMs },
    });
  } catch (err) {
    console.error("Get influencer by email API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

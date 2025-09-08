import { NextResponse } from "next/server";
import { z } from "zod";
import admin from "@/lib/firebase-admin";

const schema = z.object({
  serviceId: z.string().min(1, "serviceId is required"),
});

const db = admin.firestore();

export async function POST(req) {
  try {
    const body = await req.json();

    // ✅ Validate body with zod
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }

    const { serviceId } = parsed.data;

    // ✅ Fetch document from Firestore
    const docRef = db.collection("service_pricing_configs").doc(serviceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: `Service with id ${serviceId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      serviceId,
      ...doc.data(),
    });
  } catch (error) {
    console.error("❌ Error fetching service config:", error);
    return NextResponse.json(
      { error: "Failed to fetch service config" },
      { status: 500 }
    );
  }
}

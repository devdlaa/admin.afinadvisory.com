import admin from "@/lib/firebase-admin";
import razorpay from "@/lib/razorpay";
import { NextResponse } from "next/server";
import { requirePermission } from "@/utils/server/requirePermission";
export async function POST(req) {
  try {
    // Permission check placeholder
    const permissionCheck = await requirePermission(
      req,
      "bookings.create_new_link"
    );
    if (permissionCheck) return permissionCheck;

    const body = await req.json();

    // --- 1. Validate incoming notes object ---
    if (!body.user || !body.payment) {
      return NextResponse.json(
        { error: "Invalid payload: user and payment info required" },
        { status: 400 }
      );
    }

    const { user, payment, service, plan } = body;

    if (!user.firstName || !user.email || !user.mobile) {
      return NextResponse.json(
        { error: "User details incomplete" },
        { status: 400 }
      );
    }

    if (!payment.finalPayment) {
      return NextResponse.json(
        { error: "Payment final amount missing" },
        { status: 400 }
      );
    }

    // --- 2. Pre-create Firestore doc with isReady=false ---
    const docRef = admin.firestore().collection("payment_links").doc();
    const docId = docRef.id;

    await docRef.set({
      payment_link_db_id: docId,
      notes: body,
      isReady: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      // --- 3. Prepare Razorpay payment link payload ---
      const linkPayload = {
        amount: payment.finalPayment * 100, // paise
        currency: payment.currency || "INR",
        description: `Payment for ${service?.name || plan?.name}`,
        customer: {
          name: `${user.firstName} ${user.lastName || ""}`,
          email: user.email,
          contact: user.mobile,
        },
        notify: { sms: true, email: true },
        reminder_enable: true,
        notes: {
          firestore_payment_link_doc_id: docId,
        },
        callback_url: "https://afinadvisory.com/dashboard",
        callback_method: "get",
      };

      // --- 4. Create Razorpay payment link ---
      const paymentLink = await razorpay.paymentLink.create(linkPayload);

      // --- 5. Update Firestore doc with Razorpay details & mark isReady=true ---
      await docRef.update({
        razorpay_id: paymentLink.id,
        expire_by: paymentLink.expire_by || null,
        expired_at: paymentLink.expired_at || null,
        pid: paymentLink.id,
        notify: paymentLink.notify || { email: true, sms: true },
        reference_id: paymentLink.reference_id || "",
        reminder_enable: paymentLink.reminder_enable || false,
        reminders: paymentLink.reminders || [],
        short_url: paymentLink.short_url,
        status: paymentLink.status,
        updated_at: paymentLink.updated_at,
        user_id: user.uid || user?.email,
        isReady: true,
      });

      return NextResponse.json({ success: true, paymentLink });
    } catch (err) {
      console.error("❌ Razorpay link creation failed:", err);

      // --- 6. Leave isReady=false (doc already exists) ---
      await docRef.update({
        error: err.message || "Failed to create Razorpay link",
      });

      return NextResponse.json(
        { success: false, error: "Failed to create payment link" },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("❌ API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";        
import { SEND_EMAIL } from "@/utils/sendemail";  

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;

const RequestSchema = z.object({
  email: z.string().email("Please provide a valid email").trim().toLowerCase(),
});

export async function POST(req) {
  try {
    // ✅ Read and validate request body
    const rawBody = await req.text();
    if (!rawBody || rawBody.trim() === "") {
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset link will be sent."
      });
    }

    const body = JSON.parse(rawBody);
    const { email } = RequestSchema.parse(body);

    // ✅ Check if user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch {
      // Don’t reveal if email exists (security)
      return NextResponse.json({
        success: true,
        message: "If the email exists, a reset link will be sent."
      });
    }

    // ✅ Generate password reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: `${FRONTEND_URL}/login`, 
    });

    // ✅ Send email using your email service
    const emailResult = await SEND_EMAIL({
      to: email,
      type: "SEND_USER_PWD_RESET_LINK",
      variables: {
        recipientName: userRecord.displayName || "User",
        resetLink,
        expiryHours: 24,
      },
    });

    if (!emailResult?.success) {
      console.error("Email sending failed:", emailResult?.error);
      return NextResponse.json({
        success: false,
        message: "Reset link generated but email failed to send.",
        link: resetLink, // Optional: for admin debugging
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "If the email exists, a password reset link has been sent.",
    });

  } catch (error) {
    console.error("Reset API Error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        message: "Invalid input",
        errors: error.errors.map(e => ({
          field: e.path.join("."),
          message: e.message,
        })),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred.",
    }, { status: 500 });
  }
}

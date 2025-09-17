import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";

// Input validation schema
const GenerateQrSchema = z.object({
  token: z.string(),
});

// JWT secret for decoding invitation token
const INVITE_JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const body = await req.json();
    const { token } = GenerateQrSchema.parse(body);

    // Decode and verify JWT token
    let payload;
    try {
      payload = jwt.verify(token, INVITE_JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { email, userCode, purpose } = payload;
    if (!email || !userCode || !purpose) {
      return NextResponse.json(
        { success: false, error: "Invalid token payload" },
        { status: 400 }
      );
    }

    // Check if token purpose is valid for this operation
    if (purpose !== "user_invitation" && purpose !== "onboarding_reset") {
      return NextResponse.json(
        { success: false, error: "Invalid token purpose" },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const userQuery = await db
      .collection("admin_users")
      .where("email", "==", email)
      .where("userCode", "==", userCode)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return NextResponse.json(
        { success: false, error: "User not found or token mismatch" },
        { status: 404 }
      );
    }

    const userSnap = userQuery.docs[0];
    const userRef = userSnap.ref;
    const userData = userSnap.data();

    if (userData.userCode !== userCode) {
      return NextResponse.json(
        { success: false, error: "Token does not match user" },
        { status: 400 }
      );
    }

    // Different validation based on purpose
    if (purpose === "user_invitation") {
      if (userData.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "User already onboarded" },
          { status: 403 }
        );
      }
    } else if (purpose === "onboarding_reset") {
      // For onboarding reset, user must be active
      if (userData.status !== "active") {
        return NextResponse.json(
          { success: false, error: "User account is not active" },
          { status: 403 }
        );
      }

      // Check if user has Firebase Auth account
      if (!userData.firebaseAuthUid) {
        return NextResponse.json(
          { success: false, error: "User authentication not found" },
          { status: 400 }
        );
      }

      // Verify the reset token matches what's in the database
      if (userData.resetToken !== token) {
        return NextResponse.json(
          { success: false, error: "Invalid reset token" },
          { status: 401 }
        );
      }

      // Check if reset token has expired
      if (userData.resetExpiresAt) {
        const expiryDate = new Date(userData.resetExpiresAt);
        if (new Date() > expiryDate) {
          return NextResponse.json(
            { success: false, error: "Reset token has expired" },
            { status: 401 }
          );
        }
      }
    }

    // Generate TOTP secret
    const totpSecret = authenticator.generateSecret();

    // Generate OTP auth URL for QR code
    const otpauth = authenticator.keyuri(email, "AFIN ADVISORY", totpSecret);

    // Update user document with TOTP secret and additional info
    const updateData = {
      totpSecret,
      updatedAt: new Date().toISOString(),
    };

    // Add purpose-specific data
    if (purpose === "onboarding_reset") {
      updateData.reonboardingResetInProgress = true; //passwordResetInProgress
      updateData.reonboardingResetInitiatedAt = new Date().toISOString(); //passwordResetInitiatedAt
    }

    await userRef.update(updateData);

    return NextResponse.json({
      success: true,
      message:
        purpose === "onboarding_reset"
          ? "Password reset TOTP generated"
          : "TOTP secret generated",
      qrCodeUrl: otpauth,
      purpose,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          errors: err.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("Generate QR error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

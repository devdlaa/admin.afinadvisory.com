import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import crypto from "crypto";

import { SEND_EMAIL } from "@/utils/server/sendemail";

const prisma = new PrismaClient();

// Input validation schema
const VerifyOnboardingSchema = z.object({
  token: z.string().min(1, "Token is required"),
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});

// JWT secret
const INVITE_JWT_SECRET = process.env.JWT_ADMIN_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL;

// Hash function to match stored token hash
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, totpCode } = VerifyOnboardingSchema.parse(body);

    // 1️⃣ Decode and verify JWT token
    let payload;
    try {
      payload = jwt.verify(token, INVITE_JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { sub: userId, purpose } = payload;

    if (!userId || !purpose) {
      return NextResponse.json(
        { success: false, error: "Invalid token payload" },
        { status: 400 }
      );
    }

    // 2️⃣ Check if token purpose is valid
    if (!["user_invitation", "onboarding_reset"].includes(purpose)) {
      return NextResponse.json(
        { success: false, error: "Invalid token purpose" },
        { status: 400 }
      );
    }

    // 3️⃣ Hash the token to match stored hash
    const tokenHash = hashToken(token);

    // 4️⃣ Fetch user from database
    const user = await prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 5️⃣ Verify token hash matches
    if (user.onboarding_token_hash !== tokenHash) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 6️⃣ Check if token has expired
    if (
      user.onboarding_token_expires_at &&
      new Date() > user.onboarding_token_expires_at
    ) {
      return NextResponse.json(
        { success: false, error: "Onboarding token has expired" },
        { status: 401 }
      );
    }

    // 7️⃣ Check if user is deleted
    if (user.deleted_at) {
      return NextResponse.json(
        { success: false, error: "User account has been deleted" },
        { status: 403 }
      );
    }

    // 8️⃣ Check if user status is INACTIVE
    if (user.status !== "INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "User already onboarded or account is suspended",
        },
        { status: 403 }
      );
    }

    // 9️⃣ Check if user already completed onboarding
    if (user.onboarding_completed) {
      return NextResponse.json(
        { success: false, error: "User has already completed onboarding" },
        { status: 403 }
      );
    }

    // 🔟 Check if TOTP secret exists (should be set in initiate step)
    if (!user.totp_secret) {
      return NextResponse.json(
        {
          success: false,
          error: "TOTP secret not found. Please restart onboarding.",
        },
        { status: 400 }
      );
    }

    // 1️⃣1️⃣ Check if password was set (should be set in initiate step)
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error: "Password not set. Please restart onboarding.",
        },
        { status: 400 }
      );
    }

    // 1️⃣2️⃣ Verify TOTP code
    const isValidTotp = authenticator.check(totpCode, user.totp_secret);
    if (!isValidTotp) {
      return NextResponse.json(
        { success: false, error: "Invalid TOTP code. Please try again." },
        { status: 400 }
      );
    }

    // 1️⃣3️⃣ All validations passed - Activate user and mark onboarding complete
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        onboarding_completed: true,
        is_2fa_enabled: true,
        two_fa_verified_at: new Date(),
        onboarding_token_hash: null,
        onboarding_token_expires_at: null,
        password_set_at: new Date(),
      },
    });

    try {
      await SEND_EMAIL({
        to: OWNER_EMAIL,
        type: "ADMIN_USER_ONBOARDED_NOTIFICATION",
        variables: {
          userFullName: user.name || "",
          userEmail: user.email,
          userPhoneNumber: user.phone || "",
          userCode: user.user_code,
          onboardingDate: new Date().toISOString(),
        },
      });
    } catch (emailError) {
      console.warn("Failed to send onboarding notification email:");
      // Don't fail the onboarding if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully! You can now login.",
      data: {
        email: user.email,
        name: user.name,
        user_code: user.user_code,
      },
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

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

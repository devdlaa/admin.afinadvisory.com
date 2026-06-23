import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

// Input validation schema
const InitiateOnboardingSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain uppercase letter")
      .regex(/[a-z]/, "Password must contain lowercase letter")
      .regex(/[0-9]/, "Password must contain number")
      .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
    confirm_password: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// JWT secret for decoding invitation token
const INVITE_JWT_SECRET = process.env.JWT_ADMIN_SECRET;
const COMPANY_NAME = process.env.COMPANY_NAME || "AFINTHRIVE ADVISORY";

// Hash function to match stored token hash
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, password } = InitiateOnboardingSchema.parse(body);

    // 1️⃣ Decode and verify JWT token
    let payload;
    try {
      payload = jwt.verify(token, INVITE_JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const { sub: userId, purpose } = payload;

    if (!userId || !purpose) {
      return NextResponse.json(
        { success: false, error: "Invalid token payload" },
        { status: 400 },
      );
    }

    if (!["user_invitation", "onboarding_reset"].includes(purpose)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token purpose. This token is not for onboarding.",
        },
        { status: 400 },
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
        { status: 404 },
      );
    }

    // 5️⃣ Verify token hash matches
    if (user.onboarding_token_hash !== tokenHash) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    // 6️⃣ Check if token has expired
    if (
      user.onboarding_token_expires_at &&
      new Date() > user.onboarding_token_expires_at
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Onboarding token has expired. Please request a new invitation.",
        },
        { status: 401 },
      );
    }

    // 7️⃣ Check if user is deleted
    if (user.deleted_at) {
      return NextResponse.json(
        { success: false, error: "User account has been deleted" },
        { status: 403 },
      );
    }

    // 8️⃣ Check if user status is INACTIVE (pending onboarding)
    if (user.status !== "INACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error:
            "User has already completed onboarding or account is suspended",
        },
        { status: 403 },
      );
    }

    // 9️⃣ Check if user already has onboarding completed
    if (user.onboarding_completed) {
      return NextResponse.json(
        { success: false, error: "User has already completed onboarding" },
        { status: 403 },
      );
    }

    // 🔟 Generate TOTP secret
    const totpSecret = authenticator.generateSecret();

    // 1️⃣1️⃣ Generate OTP auth URL for QR code (frontend will generate QR from this)
    const otpauth = authenticator.keyuri(user.email, COMPANY_NAME, totpSecret);

    // 1️⃣2️⃣ Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1️⃣3️⃣ Update user with TOTP secret and hashed password (but don't activate yet)
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        totp_secret: totpSecret,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password set successfully. Please verify your 2FA code.",
      data: {
        qrCodeUrl: otpauth,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          errors: err.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

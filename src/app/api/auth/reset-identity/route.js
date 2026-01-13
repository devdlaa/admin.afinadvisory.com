import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

// Input validation schema
const PasswordResetSchema = z
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
    totpCode: z.string().length(6, "TOTP code must be 6 digits"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// JWT secret for decoding reset token
const RESET_JWT_SECRET = process.env.JWT_SECRET;

// Hash function to match stored token hash
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, password, totpCode } = PasswordResetSchema.parse(body);

    // 1️⃣ Decode and verify JWT token
    let payload;
    try {
      payload = jwt.verify(token, RESET_JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
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

    // 2️⃣ Check if token purpose is valid for password reset
    if (purpose !== "password_reset") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token purpose. This token is not for password reset.",
        },
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
    if (user.password_reset_token_hash !== tokenHash) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 401 }
      );
    }

    // 6️⃣ Check if token has expired
    if (
      user.password_reset_token_expires_at &&
      new Date() > user.password_reset_token_expires_at
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password reset token has expired. Please request a new reset link.",
        },
        { status: 401 }
      );
    }

    // 7️⃣ Check if user is deleted
    if (user.deleted_at) {
      return NextResponse.json(
        { success: false, error: "Invalid User Account" },
        { status: 403 }
      );
    }

    // 8️⃣ Check if user status is ACTIVE (only active users can reset password)
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          error: "User account is not active. Please contact support.",
        },
        { status: 403 }
      );
    }

    // 9️⃣ Check if user has completed onboarding (can't reset if never onboarded)
    if (!user.onboarding_completed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Account setup not completed. Please complete onboarding first.",
        },
        { status: 403 }
      );
    }

    // 🔟 Check if TOTP secret exists (user must have 2FA enabled)
    if (!user.totp_secret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Two-factor authentication not set up. Please contact support.",
        },
        { status: 400 }
      );
    }

    // 1️⃣1️⃣ Verify TOTP code using EXISTING secret (NOT generating new one!)
    const isValidTotp = authenticator.check(totpCode, user.totp_secret);
    if (!isValidTotp) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication code. Please try again.",
        },
        { status: 400 }
      );
    }

    // 1️⃣2️⃣ Check if new password is same as old password (optional but good practice)
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          error: "New password cannot be the same as your current password.",
        },
        { status: 400 }
      );
    }

    // 1️⃣3️⃣ Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1️⃣4️⃣ Update user password and clear reset token (atomic operation)
    await prisma.adminUser.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        password_reset_token_hash: null,
        password_reset_token_expires_at: null,
        last_password_reset_request_at: null,
        password_set_at: new Date(),
      },
    });

    // 1️⃣5️⃣ Success response
    return NextResponse.json({
      success: true,
      message:
        "Password reset successful! You can now login with your new password.",
      data: {
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
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

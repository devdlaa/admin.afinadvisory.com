import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";

import { SEND_EMAIL } from "@/utils/sendemail";

// Input validation schema
const VerifyQrSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
  totpCode: z.string().min(6),
});

// JWT secret
const INVITE_JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, password, totpCode } = VerifyQrSchema.parse(body);

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

    // Check if token purpose is valid
    if (purpose !== "user_invitation" && purpose !== "onboarding_reset") {
      return NextResponse.json(
        { success: false, error: "Invalid token purpose" },
        { status: 400 }
      );
    }

    // Fetch Firestore user
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

    // Purpose-specific validation
    if (purpose === "user_invitation") {
      if (userData.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "User already onboarded" },
          { status: 403 }
        );
      }
    } else if (purpose === "onboarding_reset") {
      if (userData.status !== "active") {
        return NextResponse.json(
          { success: false, error: "User account is not active" },
          { status: 403 }
        );
      }

      // Verify Firebase Auth user exists
      if (!userData.firebaseAuthUid) {
        return NextResponse.json(
          { success: false, error: "User authentication not found" },
          { status: 400 }
        );
      }

      // Double-check the user exists in Firebase Auth
      try {
        await admin.auth().getUser(userData.firebaseAuthUid);
      } catch (authError) {
        console.error("Firebase Auth user not found:", authError);
        return NextResponse.json(
          { success: false, error: "User authentication not found in system" },
          { status: 400 }
        );
      }

      // Verify the reset token matches
      if (userData.resetToken !== token) {
        return NextResponse.json(
          { success: false, error: "Invalid reset token" },
          { status: 401 }
        );
      }

      // Check token expiry
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

    if (!userData.totpSecret) {
      return NextResponse.json(
        { success: false, error: "TOTP secret not found, regenerate QR" },
        { status: 400 }
      );
    }

    // Verify TOTP code
    const isValidTotp = authenticator.check(totpCode, userData.totpSecret);
    if (!isValidTotp) {
      return NextResponse.json(
        { success: false, error: "Invalid TOTP code" },
        { status: 400 }
      );
    }

    let responseMessage;
    let updateData = {
      twoFactorEnabled: true,
      totpVerifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (purpose === "user_invitation") {
      // Create Firebase Auth user for new onboarding
      let createdUser;
      try {
        createdUser = await admin.auth().createUser({
          email,
          password,
        });
      } catch (authError) {
        console.error("Firebase Auth creation error:", authError);
        return NextResponse.json(
          {
            success: false,
            error: authError.message || "Failed to create Auth user",
          },
          { status: 500 }
        );
      }

      // Update for new user onboarding
      updateData.status = "active";
      updateData.firebaseAuthUid = createdUser.uid;
      responseMessage = "User onboarded successfully";

      // Send admin notification email for new user onboarding
      try {
        await SEND_EMAIL({
          to: process.env.SERVICE_EMAIL,
          type: "ADMIN_USER_ONBOARDED_NOTIFICATION",
          variables: {
            userFullName: userData.name || "",
            userEmail: userData.email,
            userPhoneNumber: userData.phone || "",
            onboardingDate: new Date().toISOString(),
          },
        });
        console.log("Admin notified via email for new user onboarding");
      } catch (emailError) {
        console.warn("Failed to send onboarding email to admin:", emailError);
      }

    } else if (purpose === "onboarding_reset") {
      // Update existing Firebase Auth user password
      try {
        await admin.auth().updateUser(userData.firebaseAuthUid, {
          password: password,
        });
      } catch (authError) {
        console.error("Firebase Auth password update error:", authError);
        return NextResponse.json(
          {
            success: false,
            error: authError.message || "Failed to update password",
          },
          { status: 500 }
        );
      }

      // Clear password reset related fields and update TOTP
      updateData.resetToken = null;
      updateData.resetExpiresAt = null;
      updateData.passwordResetInProgress = false;
      updateData.passwordResetCompletedAt = new Date().toISOString();
      updateData.lastPasswordChangeAt = new Date().toISOString();
      
      responseMessage = "Password reset completed successfully";

      // Send admin notification email for password reset
      try {
        await SEND_EMAIL({
          to: process.env.SERVICE_EMAIL,
          type: "ADMIN_USER_PASSWORD_RESET_NOTIFICATION",
          variables: {
            userFullName: userData.name || "",
            userEmail: userData.email,
            userPhoneNumber: userData.phone || "",
            resetDate: new Date().toISOString(),
          },
        });
        console.log("Admin notified via email for password reset");
      } catch (emailError) {
        console.warn("Failed to send password reset notification email:", emailError);
      }
    }

    // Update Firestore user
    await userRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: responseMessage,
      purpose, // Return purpose for frontend handling
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

    console.error("Verify QR error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
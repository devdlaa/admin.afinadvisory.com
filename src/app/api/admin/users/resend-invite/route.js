import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import admin from "@/lib/firebase-admin";
import { SEND_EMAIL } from "@/utils/sendemail";
import { ResendInviteSchema } from "@/app/schemas/UserSchema/UserSchema";
import jwt from "jsonwebtoken";
import { requirePermission } from "@/lib/requirePermission";
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || "https://afinadvisory.com";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "info@afinadvisory.com";

// Response helpers
const createSuccessResponse = (message, data = {}, status = 200) => {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
};

const createErrorResponse = (errors, status = 400) => {
  const errorArray = Array.isArray(errors) ? errors : [errors];
  return NextResponse.json(
    {
      success: false,
      errors: errorArray,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
};

// Check if user can receive invite
function canResendInvite(userData) {
  if (!userData) {
    throw new Error("User data is missing");
  }

  if (userData.status === "active") {
    throw new Error("User is already active and doesn't need an invitation");
  }

  if (userData.status === "disabled") {
    throw new Error("Cannot send invitation to disabled user");
  }

  const requiredFields = ["name", "email", "phone", "userCode"];
  const missingFields = requiredFields.filter((field) => !userData[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `User data incomplete. Missing: ${missingFields.join(", ")}`
    );
  }

  return true;
}

// Rate limiting check
function checkRateLimit(userData) {
  const now = new Date();
  const lastSent = userData.lastInvitationSentAt
    ? new Date(userData.lastInvitationSentAt)
    : null;

  if (lastSent) {
    const timeDiff = now.getTime() - lastSent.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 1) {
      const remainingMinutes = Math.ceil(60 - hoursDiff * 60);
      throw new Error(
        `Please wait ${remainingMinutes} minutes before resending invitation`
      );
    }
  }

  return true;
}

// Generate invite token
function generateInviteToken(userData) {
  return jwt.sign(
    {
      email: userData.email,
      phone: userData.phone,
      name: userData.name,
      userCode: userData.userCode,
      purpose: "user_invitation",
      resend: true,
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

// Send invitation email
async function sendInvitationEmail(userData, inviteToken) {
  try {
    const inviteLink = `${FRONTEND_URL}/user-onboarding?token=${inviteToken}`;

    const emailResult = await SEND_EMAIL({
      to: userData.email,
      type: "SEND_USER_INVITE_LINK",
      variables: {
        recipientName: userData.name,
        inviterName: userData.invitedBy || "Admin User",
        inviteLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    });

    if (!emailResult?.success) {
      throw new Error(emailResult?.error || "Unknown email service error");
    }

    return { success: true };
  } catch (error) {
    console.error("Email sending failed:", error);
    return {
      success: false,
      error: error.message || "Failed to send invitation email",
    };
  }
}

export async function POST(req) {
  try {
    const permissionCheck = await requirePermission(
      req,
      "users.resend_invite"
    );
    if (permissionCheck) return permissionCheck;
    if (!JWT_SECRET) {
      return createErrorResponse(
        [
          {
            field: "server",
            message: "Server configuration error",
          },
        ],
        500
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        [
          {
            field: "body",
            message: "Invalid JSON in request body",
          },
        ],
        400
      );
    }

    // Validate input data
    let validatedData;
    try {
      validatedData = ResendInviteSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        const formattedErrors = validationError.errors.map((error) => ({
          field: error.path.join("."),
          message: error.message,
          receivedValue: error.received,
        }));
        return createErrorResponse(formattedErrors, 400);
      }

      return createErrorResponse(
        [
          {
            field: "validation",
            message: validationError.message || "Data validation failed",
          },
        ],
        400
      );
    }

    const db = admin.firestore();
    const usersRef = db.collection("admin_users");

    // Find user by email
    const userQuery = await usersRef
      .where("email", "==", validatedData.email)
      .get();

    if (userQuery.empty) {
      return createErrorResponse(
        [
          {
            field: "email",
            message: "User not found with this email address",
          },
        ],
        404
      );
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Validate user eligibility and rate limiting
    try {
      canResendInvite(userData);
      checkRateLimit(userData);
    } catch (validationError) {
      return createErrorResponse(
        [
          {
            field: "user",
            message: validationError.message,
          },
        ],
        400
      );
    }

    // Generate new invite token
    let newInviteToken;
    try {
      newInviteToken = generateInviteToken(userData);
    } catch (tokenError) {
      return createErrorResponse(
        [
          {
            field: "server",
            message: "Failed to generate invitation token",
          },
        ],
        500
      );
    }

    // Send invitation email
    const emailResult = await sendInvitationEmail(userData, newInviteToken);

    if (!emailResult.success) {
      return createErrorResponse(
        [
          {
            field: "email",
            message: `Failed to send invitation: ${emailResult.error}`,
          },
        ],
        500
      );
    }

    // Update user record
    const now = new Date().toISOString();
    const updateData = {
      inviteToken: newInviteToken,
      inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastInvitationSentAt: now,
      isInvitationLinkResent: true,
      updatedAt: now,
    };

    try {
      await userDoc.ref.update(updateData);
    } catch (updateError) {
      console.error("Error updating user after email sent:", updateError);

      return createSuccessResponse(
        "Invitation sent but database update failed",
        {
          email: validatedData.email,
          emailSent: true,
          databaseUpdated: false,
          warning: "Please contact support if you don't receive the email",
        },
        206
      );
    }

    // Success response
    return createSuccessResponse("Invitation resent successfully", {
      email: validatedData.email,
      name: userData.name,
      userCode: userData.userCode,
      emailSent: true,
      sentAt: now,
    });
  } catch (error) {
    console.error(
      "Unexpected error in POST /api/admin/users/resend-invite:",
      error
    );

    if (error.name === "TypeError") {
      return createErrorResponse(
        [
          {
            field: "server",
            message: "Invalid data type in request",
          },
        ],
        400
      );
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return createErrorResponse(
        [
          {
            field: "server",
            message: "External service unavailable",
          },
        ],
        503
      );
    }

    return createErrorResponse(
      [
        {
          field: "server",
          message:
            process.env.NODE_ENV === "development"
              ? error.message || "Internal server error"
              : "Internal server error",
        },
      ],
      500
    );
  }
}

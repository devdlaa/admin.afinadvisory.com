import { z } from "zod";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
import { generatePasswordResetToken } from "@/services_backup/admin/admin-user.service";
import { SEND_EMAIL } from "@/utils/server/sendemail";
// import { auth } from "@/utils/auth";

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = process.env.SERVICE_EMAIL;

// Validation schema
const PasswordResetRequestSchema = z.object({
  email: z.string().email("Please provide a valid email").trim().toLowerCase(),
});

export async function POST(req) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    // const session = await auth();
    // if (!session?.user) {
    //   return createErrorResponse(
    //     "Unauthorized - Please login to continue",
    //     401,
    //     "AUTH_REQUIRED"
    //   );
    // }
    // const permissionCheck = await requirePermission(req, "users.reset_password");
    // if (permissionCheck) return permissionCheck;

    const session = {
      username: "admin",
      user_id: "admin-user-id",
    };

    const body = PasswordResetRequestSchema.parse(await req.json());

    // Generate password reset token
    const result = await generatePasswordResetToken(
      body.email,
      session.user_id
    );

    if (!result) {
      return createSuccessResponse(
        "If the email exists, a password reset link has been sent."
      );
    }

    // Generate reset link
    const resetLink = `${FRONTEND_URL}/reset-password?token=${result.resetToken}`;

    // Send email
    const emailResult = await SEND_EMAIL({
      to: result.email,
      type: "SEND_USER_PWD_RESET_LINK",
      variables: {
        recipientName: result.name,
        resetLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    });

    // Log email failure but don't expose to user
    if (!emailResult.success) {
      console.error("Failed to send password reset email:", emailResult.error);
    }

    // Always return success (security: don't reveal internal state)
    return createSuccessResponse(
      "If the email exists, a password reset link has been sent."
    );
  } catch (e) {
    return handleApiError(e);
  }
}

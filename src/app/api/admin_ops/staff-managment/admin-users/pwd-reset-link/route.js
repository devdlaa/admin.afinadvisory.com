import { schemas } from "@/schemas";

import { generatePasswordResetToken } from "@/services/admin/admin-user.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";
import { SEND_EMAIL } from "@/utils/server/sendemail";

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = process.env.SERVICE_EMAIL;

export async function POST(req) {
  try {
    // permission check
    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const admin_user_id = uuidSchema.parse(await req.json());

    const result = await generatePasswordResetToken(
      admin_user_id,
      session.user.id
    );

    // Always respond neutrally to avoid user enumeration
    if (!result) {
      return createSuccessResponse(
        "If the email exists, a password reset link has been sent."
      );
    }

    const resetLink = `${FRONTEND_URL}/reset-password?token=${result.resetToken}`;

    // send reset email
    SEND_EMAIL({
      to: result.email,
      type: "SEND_USER_PWD_RESET_LINK",
      variables: {
        recipientName: result.name,
        resetLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    }).catch((err) => {
      console.error("Failed to send onboarding email:", err);
    });

    return createSuccessResponse(
      "If the email exists, a password reset link has been sent."
    );
  } catch (error) {
    return handleApiError(error);
  }
}

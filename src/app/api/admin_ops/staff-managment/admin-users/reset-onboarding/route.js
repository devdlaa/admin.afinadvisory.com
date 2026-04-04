import { uuidSchema } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { generateOnboardingResetToken } from "@/services/admin/admin-user.service";
import { SEND_EMAIL } from "@/utils/server/sendemail";

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = process.env.SERVICE_EMAIL;

export async function POST(req) {
  try {
  
    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const admin_user_id = uuidSchema.parse(await req.json());
    const result = await generateOnboardingResetToken(
      admin_user_id,
      session.user.id
    );
 

    if (!result) {
      return createSuccessResponse(
        "If the email exists, an onboarding reset link has been sent."
      );
    }

    const resetLink = `${FRONTEND_URL}/user-onboarding?token=${result.resetToken}`;

    SEND_EMAIL({
      to: result.email,
      type: "SEND_USER_ONBOARDING_RESET_LINK",
      variables: {
        recipientName: result.name,
        onboardingResetLink: resetLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    }).catch((err) => {
      console.error("Failed to send onboarding email:");
    });

    return createSuccessResponse(
      "If the email exists, an onboarding reset link has been sent."
    );
  } catch (error) {
    return handleApiError(error);
  }
}

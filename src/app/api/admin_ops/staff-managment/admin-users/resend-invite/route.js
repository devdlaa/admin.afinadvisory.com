import { schemas } from "@/schemas";

import { resendOnboardingInvite } from "@/services/admin/admin-user.service";

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
    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;


    const admin_user_id = uuidSchema.parse(await req.json());
    // service generates new onboarding token
    const { email, name, onboardingToken } = await resendOnboardingInvite(
      admin_user_id,
      session.user.id
    );

    const inviteLink = `${FRONTEND_URL}/user-onboarding?token=${onboardingToken}`;

    // send invitation email
    SEND_EMAIL({
      to: email,
      type: "SEND_USER_INVITE_LINK",
      variables: {
        recipientName: name,
        inviterName: session.user.name ?? "Admin",
        inviteLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    }).catch((err) => {
      console.error("Failed to send onboarding email:", err);
    });

    return createSuccessResponse("Invitation resent successfully", {
      email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

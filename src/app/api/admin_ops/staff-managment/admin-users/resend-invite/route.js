import { schemas } from "@/schemas";
import { resendOnboardingInvite } from "@/services_backup/admin/admin-user.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
import { SEND_EMAIL } from "@/utils/server/sendemail";

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = process.env.SERVICE_EMAIL;

export async function POST(req) {
  try {
    // TODO : AUTH VALIDATION & PERMISSION CHECK
    // const session = await auth();
    // if (!session?.user) {
    //   return createErrorResponse(
    //     "Unauthorized - Please login to continue",
    //     401,
    //     "AUTH_REQUIRED"
    //   );
    // }

    // // Permission check - uncomment and configure based on your permission mapping
    // const permissionCheck = await requirePermission(request, "business.manage");
    // if (permissionCheck) return permissionCheck;

    const session = {
      username: "admin",
      user_id: 1221,
    };

    const body = schemas.adminUser.resendOnboardinLink.parse(await req.json());

    const { email, name, onboardingToken } = await resendOnboardingInvite(
      body.user_id,
      session.user_id
    );

    // Generate invitation link
    const inviteLink = `${FRONTEND_URL}/user-onboarding?token=${onboardingToken}`;

    // Send invitation email
    const emailResult = await SEND_EMAIL({
      to: email,
      type: "SEND_USER_INVITE_LINK",
      variables: {
        recipientName: name,
        inviterName: session.username,
        inviteLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    });

    // TODO: Handle email failure if needed
    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
    }

    return createSuccessResponse("Invitation resent successfully", { email });
  } catch (e) {
    return handleApiError(e);
  }
}

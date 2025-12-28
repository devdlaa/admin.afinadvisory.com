import { z } from "zod";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
import { generateOnboardingResetToken } from "@/services_backup/admin/admin-user.service";
import { SEND_EMAIL } from "@/utils/server/sendemail";
// import { auth } from "@/utils/auth";

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = process.env.SERVICE_EMAIL;

// Validation schema
const OnboardingResetRequestSchema = z.object({
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
    // const permissionCheck = await requirePermission(req, "users.reset_onboarding");
    // if (permissionCheck) return permissionCheck;

    const session = {
      username: "admin",
      user_id: "admin-user-id", // TODO: Replace with actual user ID from session
    };

    const body = OnboardingResetRequestSchema.parse(await req.json());

    // Generate onboarding reset token
    const result = await generateOnboardingResetToken(
      body.email,
      session.user_id
    );

    if (!result) {
      return createSuccessResponse(
        "If the email exists, an onboarding reset link has been sent."
      );
    }

    const resetLink = `${FRONTEND_URL}/user-onboarding?token=${result.resetToken}`;

    const emailResult = await SEND_EMAIL({
      to: result.email,
      type: "SEND_USER_ONBOARDING_RESET_LINK",
      variables: {
        recipientName: result.name,
        onboardingResetLink: resetLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    });

    if (!emailResult.success) {
      console.error(
        "Failed to send onboarding reset email:",
        emailResult.error
      );
    }

    return createSuccessResponse(
      "If the email exists, an onboarding reset link has been sent."
    );
  } catch (e) {
    return handleApiError(e);
  }
}

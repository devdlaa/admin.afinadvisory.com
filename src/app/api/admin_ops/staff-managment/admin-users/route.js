import { schemas } from "@/schemas";

import {
  createAdminUser,
  listAdminUsers,
} from "@/services/admin/admin-user.service";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { SEND_EMAIL } from "@/utils/server/sendemail";
import { requirePermission } from "@/utils/server/requirePermission";

const FRONTEND_URL = process.env.NEXT_PUBLIC_WEB_URL;
const SUPPORT_EMAIL = process.env.SERVICE_EMAIL;

export async function POST(req) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.create"
    );

    if (permissionError) return permissionError;

    if (!session?.user) {
      return createErrorResponse(
        "Unauthorized - Please login to continue",
        401,
        "AUTH_REQUIRED"
      );
    }

    const body = schemas.adminUser.create.parse(await req.json());

    const { user, onboardingToken } = await createAdminUser(
      body,
      session?.user?.id
    );

    const inviteLink = `${FRONTEND_URL}/user-onboarding?token=${onboardingToken}`;

    const emailResult = await SEND_EMAIL({
      to: user.email,
      type: "SEND_USER_INVITE_LINK",
      variables: {
        recipientName: user.name,
        inviterName: session?.user?.name,
        inviteLink,
        expiryHours: 24,
        supportEmail: SUPPORT_EMAIL,
      },
    });

    if (!emailResult.success) {
      console.error("Failed to send invitation email:");
    }

    return createSuccessResponse(
      "Admin user created successfully. Invitation email sent.",
      user,
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "admin_users.access"
    );

    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.adminUser.list.parse({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const users = await listAdminUsers(filters);

    return createSuccessResponse("Admin users retrieved successfully", users);
  } catch (e) {
    return handleApiError(e);
  }
}

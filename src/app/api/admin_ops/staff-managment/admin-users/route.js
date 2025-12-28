import { schemas } from "@/schemas";
import {
  createAdminUser,
  listAdminUsers,
} from "@/services_backup/admin/admin-user.service";
import { createAdminUser } from "@/services/admin/admin-user.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
import { SEND_EMAIL } from "@/utils/server/sendemail";
import { auth } from "@/utils/server/auth";

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

    const body = schemas.adminUser.create.parse(await req.json());

    // Create user and get onboarding token
    const { user, onboardingToken } = await createAdminUser(
      body,
      session.user_id
    );

    // Generate invitation link
    const inviteLink = `${FRONTEND_URL}/user-onboarding?token=${onboardingToken}`;

    // Send invitation email
    const emailResult = await SEND_EMAIL({
      to: user.email,
      type: "SEND_USER_INVITE_LINK",
      variables: {
        recipientName: user.name,
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
    const { searchParams } = new URL(req.url);

    const filters = schemas.adminUser.list.parse({
      status: searchParams.get("status") || undefined,
      department_id: searchParams.get("department_id") || undefined,
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

import { uuidSchema } from "@/schemas";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { toggleAdminUserActiveStatus } from "@/services/admin/admin-user.service";

export async function POST(req) {
  try {
    const body = await req.json();

    const targetUserId = uuidSchema.parse(body.userId);

    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const updated = await toggleAdminUserActiveStatus({
      targetUserId,
      actingUserId: session.user.id,
    });

    return createSuccessResponse(
      `Admin user status toggled to ${updated.status}`,
      updated
    );
  } catch (error) {
    return handleApiError(error);
  }
}

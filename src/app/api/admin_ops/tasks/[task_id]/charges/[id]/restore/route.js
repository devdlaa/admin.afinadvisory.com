import { restoreTaskCharge } from "@/services/task/taskCharge.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function POST(request, { params }) {
  try {
    const [, session, admin_user] = await requirePermission(request);

    const isSuper = admin_user.admin_role === "SUPER_ADMIN";
    const canManage = admin_user.permissions?.includes("tasks.charge.manage");

    if (!isSuper && !canManage) {
      return handleApiError({
        status: 403,
        message: "Not allowed to restore charges",
      });
    }

    const resolvedParams = await params;

    const parsed = schemas.taskCharge.restore.parse({
      params: resolvedParams,
    });

    const restored = await restoreTaskCharge(parsed.params.id, admin_user);

    return createSuccessResponse("Charge restored successfully", restored);
  } catch (error) {
    return handleApiError(error);
  }
}

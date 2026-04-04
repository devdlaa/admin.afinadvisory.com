import { hardDeleteTaskCharge } from "@/services/task/taskCharge.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function DELETE(request, { params }) {
  try {
    const [, session,admin_user] = await requirePermission(request);
   

    if (admin_user.admin_role !== "SUPER_ADMIN") {
      return handleApiError({
        status: 403,
        message: "Only super admins can permanently delete charges",
      });
    }

    const resolvedParams = await params;

    const parsed = schemas.taskCharge.hardDelete.parse({
      params: resolvedParams,
    });

    const deleted = await hardDeleteTaskCharge(parsed.params.id, admin_user);

    return createSuccessResponse("Charge permanently deleted", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

import { deleteTaskChargeOverride } from "@/services/task/taskChargesOverride.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { schemas } from "@/schemas";

export async function DELETE(request, { params }) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      request,
    
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.taskCharge.delete.parse({
      params: resolvedParams,
    });

    const deleted = await deleteTaskChargeOverride(parsed.params.id, admin_user);

    return createSuccessResponse("Charge deleted successfully", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

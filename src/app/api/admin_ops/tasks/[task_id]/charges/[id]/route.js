import {
  updateTaskCharge,
  deleteTaskCharge,
} from "@/services/task/taskCharge.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { schemas } from "@/schemas";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.charge.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.taskCharge.update.parse({
      params: resolvedParams,
      body,
    });

    const updated = await updateTaskCharge(
      parsed.params.id,
      parsed.body,
      session.user
    );

    return createSuccessResponse("Charge updated successfully", updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.charge.manage"
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.taskCharge.delete.parse({
      params: resolvedParams,
    });

  

    const deleted = await deleteTaskCharge(parsed.params.id, session.user);

    return createSuccessResponse("Charge deleted successfully", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

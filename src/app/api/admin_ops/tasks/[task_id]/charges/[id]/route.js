import {
  updateTaskCharge,
  deleteTaskCharge,
} from "@/services/taskCharge.service";
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
    const [permissionError] = await requirePermission(request, "tasks.charge.manage");
    if (permissionError) return permissionError;

    const body = await request.json();

    const parsed = schemas.taskCharge.update.parse({
      params,
      body,
    });

    const updated = await updateTaskCharge(parsed.params.id, parsed.body);

    return createSuccessResponse("Charge updated successfully", updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.charge.manage");
    if (permissionError) return permissionError;

    const parsed = schemas.taskCharge.delete.parse({
      params,
    });

    const deleted = await deleteTaskCharge(parsed.params.id);

    return createSuccessResponse("Charge deleted successfully", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

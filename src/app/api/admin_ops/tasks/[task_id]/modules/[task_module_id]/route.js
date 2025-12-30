import {
  updateTaskModule,
} from "@/services/modules/taskmodule.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// PATCH → update name/remark override on TaskModule
export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.update"
    );
    if (permissionError) return permissionError;

    // validate path params
    const { task_id } = schemas.taskModule.delete.parse({
      task_id: params.task_id,
    });

    const task_module_id = params.task_module_id;

    // validate body with shared update schema
    const body = await request.json();
    const validated = schemas.taskModule.update.parse(body);

    if (Object.keys(validated).length === 0) {
      return createErrorResponse(
        "At least one field must be provided for update",
        400,
        "NO_FIELDS"
      );
    }

    const updated = await updateTaskModule(
      task_module_id,
      {
        ...validated,
        task_id,
      },
      session.user.id
    );

    return createSuccessResponse("Task module updated successfully", updated);
  } catch (error) {
    return handleApiError(error);
  }
}

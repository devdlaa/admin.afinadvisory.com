

import { syncTaskModules,listTaskModules } from "@/services/modules/taskmodule.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.manage"
    );
    if (permissionError) return permissionError;

    // ✔ validate task_id with centralized schema
    const { task_id } = schemas.taskModule.delete.parse({
      task_id: params.task_id,
    });

    const body = await request.json();

    const validated = schemas.taskModule.bulkCreate.parse({
      task_id,
      modules: body.modules,
    });

    const result = await syncTaskModules(
      validated.task_id,
      validated.modules,
      session.user.id
    );

    return createSuccessResponse("Task modules synced successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}


export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const { task_id } = schemas.taskModule.delete.parse({
      task_id: params.task_id,
    });

    const modules = await listTaskModules(task_id);

    return createSuccessResponse(
      "Task modules retrieved successfully",
      modules
    );
  } catch (error) {
    return handleApiError(error);
  }
}

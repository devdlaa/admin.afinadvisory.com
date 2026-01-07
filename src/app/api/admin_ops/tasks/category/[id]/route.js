import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  getTaskCategoryById,
  updateTaskCategory,
  deleteTaskCategory,
} from "@/services/task/taskCategory.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const { id } = schemas.taskCategory.id.parse(params);

    const category = await getTaskCategoryById(id);

    return createSuccessResponse(
      "Task category retrieved successfully",
      category
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.access"
    );
    if (permissionError) return permissionError;

    const { id } = schemas.taskCategory.id.parse(params);

    const body = await request.json();

    const validated = schemas.taskCategory.update.parse(body);

    const updated = await updateTaskCategory(id, validated, session.user.id);

    return createSuccessResponse("Task category updated successfully", updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError,session] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const { id } = schemas.taskCategory.id.parse(params);

    const result = await deleteTaskCategory(id,session.user.id);

    return createSuccessResponse("Task category deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

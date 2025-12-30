import {
  getTaskCategoryById,
  updateTaskCategory,
  deleteTaskCategory,
} from "@/services/task/taskCategory.service";

import { schemas, uuidSchema } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_category.access"
    );
    if (permissionError) return permissionError;

    const category_id = uuidSchema.parse(params.id);

    const category = await getTaskCategoryById(category_id);

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
    const [permissionError] = await requirePermission(
      request,
      "task_category.manage"
    );
    if (permissionError) return permissionError;

    const category_id = uuidSchema.parse(params.id);

    const body = await request.json();

    const validated = schemas.taskCategory.update.parse(body);

    const category = await updateTaskCategory(category_id, validated);

    return createSuccessResponse(
      "Task category updated successfully",
      category
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_category.delete"
    );
    if (permissionError) return permissionError;

    const category_id = uuidSchema.parse(params.id);

    const result = await deleteTaskCategory(category_id);

    return createSuccessResponse("Task category deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

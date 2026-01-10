import { z } from "zod";

import {
  getTaskById,
  updateTask,
  deleteTask,
} from "@/services/task/task.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

const uuidSchema = z.string().uuid("Invalid task ID format");

// -------------------- GET --------------------
export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const task_id = uuidSchema.parse((await params).task_id);

    const task = await getTaskById(task_id);

    return createSuccessResponse("Task retrieved successfully", task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        "Invalid task ID",
        400,
        "VALIDATION_ERROR",
        error.errors
      );
    }

    return handleApiError(error);
  }
}

// -------------------- PATCH --------------------
export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.manage"
    );
    if (permissionError) return permissionError;
    const task_id = uuidSchema.parse((await params).task_id);

    const body = await request.json();

    const validatedData = schemas.task.update.parse(body);

    if (Object.keys(validatedData).length === 0) {
      return createErrorResponse(
        "At least one field must be provided for update",
        400,
        "NO_FIELDS"
      );
    }

    const task = await updateTask(task_id, validatedData, session.user.id);

    return createSuccessResponse("Task updated successfully", task);
  } catch (error) {
    console.log(error);

    return handleApiError(error);
  }
}

// -------------------- DELETE (Soft delete) --------------------
export async function DELETE(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.delete"
    );
    if (permissionError) return permissionError;

    const task_id = uuidSchema.parse(params.id);

    const result = await deleteTask(task_id, session.user.id);

    return createSuccessResponse("Task deleted successfully", result.task);
  } catch (error) {
  console.log(error);

    return handleApiError(error);
  }
}

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
    const [permissionError,session] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const task_id = uuidSchema.parse((await params).task_id);

    const result = await getTaskById(task_id,session.user);

    return createSuccessResponse("Task retrieved successfully", result);
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

    const result = await updateTask(task_id, validatedData, session.user);

    return createSuccessResponse("Task updated successfully", result);
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

    const task_id = uuidSchema.parse((await params).task_id);

    const result = await deleteTask(task_id, session.user);

    return createSuccessResponse("Task deleted successfully", result);
  } catch (error) {
    console.log(error);

    return handleApiError(error);
  }
}

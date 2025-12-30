import {
  bulkUpdateTaskPriority,
  bulkUpdateTaskStatus,
} from "@/services/task/task.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// POST → bulk update tasks (status or priority based on query param)
export async function POST(request) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.manage"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action"); // "status" | "priority"

    const body = await request.json();

    const updated_by = session.user.id;

    let result;

    if (action === "status") {
      // validate payload
      const validated = schemas.task.bulkStatus.parse(body);

      result = await bulkUpdateTaskStatus(
        validated.task_ids,
        validated.status,
        updated_by
      );

      return createSuccessResponse(
        "Task statuses updated successfully",
        result
      );
    }

    if (action === "priority") {
      // validate payload
      const validated = schemas.task.bulkPriority.parse(body);

      result = await bulkUpdateTaskPriority(
        validated.task_ids,
        validated.priority,
        updated_by
      );

      return createSuccessResponse(
        "Task priorities updated successfully",
        result
      );
    }

    // invalid action
    return createErrorResponse(
      "Invalid action. Use ?action=status or ?action=priority",
      400,
      "INVALID_ACTION"
    );
  } catch (error) {
    if (error?.name === "ZodError") {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        error.errors
      );
    }

    return handleApiError(error);
  }
}

// app/api/tasks/assignments/bulk/route.ts

import { bulkAssignUnownedTasks } from "@/services/task/assignment.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

export async function POST(request) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      request,
      "task_assignments.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.taskAssignment.bulk.parse(body);

    const result = await bulkAssignUnownedTasks(
      validated.task_ids,
      validated.user_ids,
      admin_user.id
    );

    return createSuccessResponse("Tasks bulk assigned successfully", result);
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

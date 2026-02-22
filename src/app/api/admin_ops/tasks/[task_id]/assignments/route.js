import {
  syncTaskAssignments,
  getAssignmentsByTaskId,
} from "@/services/task/assignment.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// POST → Sync task assignments
export async function POST(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "task_assignments.manage",
    );
    if (permissionError) return permissionError;

    // validate task_id using central schema
    const { task_id } = schemas.taskAssignment.taskId.parse({
      task_id: params.task_id,
    });

    const body = await request.json();

    // validate sync payload using central schema
    const validated = schemas.taskAssignment.sync.parse({
      task_id,
      ...body,
    });

    const result = await syncTaskAssignments(
      validated.task_id,
      validated.user_ids,
      validated.assigned_to_all,
      admin_user.id,
      validated.sla_days 
      
    );

    return createSuccessResponse(
      "Task assignments synced successfully",
      result,
    );
  } catch (error) {
    if (error?.name === "ZodError") {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        error.errors,
      );
    }

    return handleApiError(error);
  }
}

// GET → Get all assignments for a task
export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    // validate task_id via schema
    const { task_id } = schemas.taskAssignment.taskId.parse({
      task_id: params.task_id,
    });

    const assignments = await getAssignmentsByTaskId(task_id);

    return createSuccessResponse(
      "Task assignments retrieved successfully",
      assignments,
    );
  } catch (error) {
    if (error?.name === "ZodError") {
      return createErrorResponse(
        "Invalid task ID",
        400,
        "VALIDATION_ERROR",
        error.errors,
      );
    }

    return handleApiError(error);
  }
}

import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
  createErrorResponse,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { syncTaskChecklist } from "@/services/taskChecklist.service";
import { z } from "zod";

const uuid = z.string().uuid("Invalid task id");

export async function POST(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.manage"
    );
    if (permissionError) return permissionError;

    const task_id = uuid.parse(params.id);

    const body = await request.json();
    const { items } = schemas.taskChecklist.sync.parse(body);

    const result = await syncTaskChecklist(task_id, items, session.user.id);

    return createSuccessResponse("Checklist synced successfully", result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        err.errors
      );
    }

    return handleApiError(err);
  }
}

import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

import { syncTaskChecklist } from "@/services/task/taskChecklist.service";
import { z } from "zod";

const uuid = z.string().uuid("Invalid task id");

export async function POST(request, { params }) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      request,
      "tasks.manage"
    );
    if (permissionError) return permissionError;

    const { task_id } = await params;

    const parsedTaskId = uuid.parse(task_id);

    const body = await request.json();

    const { items } = schemas.taskChecklist.sync.parse(body);

    const result = await syncTaskChecklist(parsedTaskId, items, admin_user);

    return createSuccessResponse("Checklist synced successfully", result);
  } catch (err) {
    console.error("Checklist sync error:", err);
    return handleApiError(err);
  }
}

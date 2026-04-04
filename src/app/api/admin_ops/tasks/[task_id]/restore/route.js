import { z } from "zod";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";
import { requireTotp } from "@/utils/server/requireTotp";
import { restoreTask } from "@/services/task/task.service";

const uuidSchema = z.string().uuid("Invalid task ID format");

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] =
      await requirePermission(request);
    if (permissionError) return permissionError;

    const task_id = uuidSchema.parse((await params).task_id);

    const body = await request.json();

    await requireTotp(body.authorizer_id, body.totp_code);

    const result = await restoreTask(task_id, admin_user);

    return createSuccessResponse("Task restored successfully", result);
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
}

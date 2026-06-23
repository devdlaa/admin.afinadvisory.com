import { getTaskCategoryBoards } from "@/services/task/task.service";

import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "tasks.access",
    );

    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const params = {
      admin_user_id: searchParams.get("admin_user_id"),
    };

    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key],
    );

    const validatedParams = schemas.task.boardQuery.parse(params);

    const result = await getTaskCategoryBoards(validatedParams, admin_user);

    return createSuccessResponse(
      "Task category boards retrieved successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

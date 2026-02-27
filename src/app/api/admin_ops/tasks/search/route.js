import { requirePermission } from "@/utils/server/requirePermission";
import { createSuccessResponse } from "@/utils/server/apiResponse";

import { searchTasks } from "@/services/task/task.service";
import { schemas } from "@/schemas";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "tasks.access",
    );

    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const params = {
      search: searchParams.get("search"),
      entity_id: searchParams.get("entity_id"),
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      task_category_id: searchParams.get("task_category_id"),
      created_date_from: searchParams.get("created_date_from"),
      created_date_to: searchParams.get("created_date_to"),
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
    };

    // Strip null values
    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key],
    );

    const validatedParams = schemas.task.search.parse(params);

    const result = await searchTasks(validatedParams, admin_user);

    return createSuccessResponse(
      "Search results retrieved successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

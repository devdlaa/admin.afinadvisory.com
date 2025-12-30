import {
  createTaskCategory,
  listTaskCategories,
} from "@/services/task/taskCategory.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_category.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    // validate with central schema
    const validated = schemas.taskCategory.create.parse(body);

    const category = await createTaskCategory(validated);

    return createSuccessResponse(
      "Task category created successfully",
      category,
      200
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_category.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const query = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      is_active: searchParams.get("is_active"),
      search: searchParams.get("search"),
    };

    const validated = schemas.taskCategory.list.parse(query);

    const result = await listTaskCategories(validated);

    return createSuccessResponse(
      "Task categories retrieved successfully",
      result
    );
  } catch (error) {
    return handleApiError(error);
  }
}

import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  listTaskCategories,
  createTaskCategory,
} from "@/services/task/taskCategory.service";
import {
  createSuccessResponse,

  handleApiError,
} from "@/utils/server/apiResponse";

export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const filters = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      search: searchParams.get("search"),
    };

    const result = await listTaskCategories(filters);

    return createSuccessResponse(
      "Task categories retrieved successfully",
      result
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const [permissionError,session] = await requirePermission(request, "tasks.manage");
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.taskCategory.create.parse(body);

    const category = await createTaskCategory(validated,session.user.id);

    return createSuccessResponse(
      "Task category created successfully",
      category,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

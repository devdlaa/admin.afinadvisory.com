import { toggleTaskCategoryBoardPin } from "@/services/task/task.service";

import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function POST(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "tasks.access",
    );

    if (permissionError) return permissionError;

    const body = await request.json();

    const validatedData = schemas.task.toggleBoardPin.parse(body);

    const result = await toggleTaskCategoryBoardPin(validatedData, admin_user);

    return createSuccessResponse(
      validatedData.new_position !== undefined
        ? "Board repositioned successfully"
        : result.is_pinned
          ? "Board pinned successfully"
          : "Board unpinned successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

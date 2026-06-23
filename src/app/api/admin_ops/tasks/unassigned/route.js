import { getUnassignedTasksCount } from "@/services/task/task.service";


import { requirePermission } from "@/utils/server/requirePermission";

import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "task_assignments.manage",
    );

    if (permissionError) return permissionError;

    if (admin_user.admin_role !== "SUPER_ADMIN") {
      return createSuccessResponse("Unassigned tasks count", { count: 0 });
    }

    const count = await getUnassignedTasksCount();

    return createSuccessResponse("Unassigned tasks count", { count });
  } catch (error) {
    return handleApiError(error);
  }
}

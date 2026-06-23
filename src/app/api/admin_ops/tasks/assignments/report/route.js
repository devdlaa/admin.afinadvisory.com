import { getAssignmentCountsPerUser } from "@/services/task/assignment.service";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_assignments.manage"
    );
    if (permissionError) return permissionError;

    const counts = await getAssignmentCountsPerUser();

    return createSuccessResponse(
      "Assignment counts retrieved successfully",
      counts
    );
  } catch (error) {
    if (error?.name === "ZodError") {
      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        error.errors
      );
    }

    return handleApiError(error);
  }
}

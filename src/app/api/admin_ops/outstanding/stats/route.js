import { getOutstandingGlobalStats } from "@/services/task/reconcile.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req, "reconcile.manage");
    if (permissionError) return permissionError;

    const result = await getOutstandingGlobalStats();

    return createSuccessResponse(
      "Outstanding global stats retrieved successfully",
      result,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

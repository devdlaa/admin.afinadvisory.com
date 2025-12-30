import { getDashboardOverview } from "@/services/shared/dashboardOverview.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(request) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "firm.access"
    );

    if (permissionError) return permissionError;

    const user_id = session.user.id;

    const overview = await getDashboardOverview(user_id);

    return createSuccessResponse(
      "Dashboard overview fetched successfully",
      overview
    );
  } catch (error) {
    return handleApiError(error);
  }
}

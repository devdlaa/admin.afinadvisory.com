import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import { listActivities } from "@/services/leadsManager/leadsActivity.service";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const parsed = schemas.leadActivity.listActivitiesDashboard.parse(
      Object.fromEntries(searchParams),
    );

    const result = await listActivities(parsed, admin_user);

    return createSuccessResponse(
      "Dashboard activities fetched successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

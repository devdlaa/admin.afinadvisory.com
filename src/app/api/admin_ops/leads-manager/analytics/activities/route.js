import { schemas } from "@/schemas";
import { getActivitiesAnalytics } from "@/services/analytics/analytics.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "leads.analytics.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.analytics.activitiesQuerySchema.parse({
      range_type: searchParams.get("range_type"),
      company_profile_id: searchParams.get("company_profile_id"),

      user_id: searchParams.get("user_id") ?? undefined,
    });

    const data = await getActivitiesAnalytics(filters);

    return createSuccessResponse("Activities analytics retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

import { schemas } from "@/schemas";

import { getTimeseries } from "@/services/leadsManager/analytics/analytics.core.service";

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

    const filters = schemas.leadAnalytics.timeseries.parse({
      range_type: searchParams.get("range_type") ?? "THIS_MONTH",
      company_profile_id: searchParams.get("company_profile_id"),

      pipeline_id: searchParams.get("pipeline_id") || undefined,
      user_id: searchParams.get("user_id") || undefined,

      interval: searchParams.get("interval") || undefined,
    });

    const data = await getTimeseries(filters);

    return createSuccessResponse("Timeseries retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

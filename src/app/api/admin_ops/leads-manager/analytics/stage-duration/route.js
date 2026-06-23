import { schemas } from "@/schemas";

import { getStageDuration } from "@/services/leadsManager/analytics/analytics.core.service";
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

    const filters = schemas.leadAnalytics.stageDuration.parse({
       range_type: searchParams.get("range_type") ?? "THIS_MONTH",
      company_profile_id: searchParams.get("company_profile_id"),

      pipeline_id: searchParams.get("pipeline_id") ?? undefined,
      stage_id: searchParams.get("stage_id") ?? undefined,
    });

    const data = await getStageDuration(filters);

    return createSuccessResponse("Stage duration retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

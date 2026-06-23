import { schemas } from "@/schemas";

import { getFunnel } from "@/services/leadsManager/analytics/analytics.core.service";

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

    const filters = schemas.leadAnalytics.funnel.parse({
      range_type: searchParams.get("range_type") ?? "THIS_MONTH",
      company_profile_id: searchParams.get("company_profile_id"),

      pipeline_id: searchParams.get("pipeline_id"), 

      stage_id: searchParams.get("stage_id") || undefined,
      user_id: searchParams.get("user_id") || undefined,
    });

    const data = await getFunnel(filters);

    return createSuccessResponse("Funnel retrieved successfully", data);
  } catch (e) {
    return handleApiError(e);
  }
}

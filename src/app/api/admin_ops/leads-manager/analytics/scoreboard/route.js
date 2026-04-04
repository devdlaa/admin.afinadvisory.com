import { schemas } from "@/schemas";

import { getScoreboard } from "@/services/leadsManager/analytics/analytics.core.service";

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

    const filters = schemas.leadAnalytics.scoreboard.parse({
      range_type: searchParams.get("range_type") ?? "THIS_MONTH",
      company_profile_id: searchParams.get("company_profile_id"),

      sort_by: searchParams.get("sort_by") || undefined,
      order: searchParams.get("order") || undefined,

      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    const data = await getScoreboard(filters);

    return createSuccessResponse("Scoreboard retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

import { schemas } from "@/schemas";

import { getUsersAnalytics } from "@/services/leadsManager/analytics/analytics.core.service";

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

    const filters = schemas.leadAnalytics.users.parse({
      range_type: searchParams.get("range_type") ?? "THIS_MONTH",
      company_profile_id: searchParams.get("company_profile_id"),

      user_id: searchParams.get("user_id") || undefined,

      include_score: searchParams.get("include_score") || undefined,

      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    });

    const data = await getUsersAnalytics(filters);

    return createSuccessResponse("User analytics retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

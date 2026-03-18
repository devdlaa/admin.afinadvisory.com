import { schemas } from "@/schemas";
import { getSourceAnalytics } from "@/services/analytics/analytics.service";

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

    const filters = schemas.analytics.sourceQuerySchema.parse({
      range_type: searchParams.get("range_type") ?? "THIS_MONTH",
      company_profile_id: searchParams.get("company_profile_id"),

      source: searchParams.get("source") ?? undefined,
    });

    const data = await getSourceAnalytics(filters);

    return createSuccessResponse("Source analytics retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

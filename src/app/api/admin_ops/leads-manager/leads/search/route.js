import { requirePermission } from "@/utils/server/requirePermission";
import { createSuccessResponse } from "@/utils/server/apiResponse";

import { searchLeads } from "@/services/leadsManager/leadCore.service";
import { schemas } from "@/schemas";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );

    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const params = {
      search: searchParams.get("search"),
      pipeline_id: searchParams.get("pipeline_id"),
      stage_id: searchParams.get("stage_id"),
      tags: searchParams.getAll("tags"),
      created_by: searchParams.get("created_by"),
      priority: searchParams.get("priority"),
      company_profile_id: searchParams.get("company_profile_id"),
      user_id: searchParams.get("user_id"),
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
    };

    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key],
    );

    const validatedParams = schemas.lead.search.parse(params);

    const result = await searchLeads(validatedParams, admin_user);

    return createSuccessResponse(
      "Search results retrieved successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

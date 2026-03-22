import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import { createLead,listPipelineLeads } from "@/services/leadsManager/leadCore.service";

/* ----------------------------------------
CREATE LEAD
---------------------------------------- */
export async function POST(request) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const parsed = schemas.lead.create.parse(body);

    const result = await createLead(parsed, admin_user);

    return createSuccessResponse("Lead created successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const [permissionError,session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const query = Object.fromEntries(searchParams.entries());

    const parsedQuery = schemas.lead.list.parse(query);

 
    if (!query.pipeline_id) {
      throw new Error("pipeline_id is required");
    }

    const result = await listPipelineLeads(
      query.pipeline_id,
      parsedQuery,
      admin_user,
    );

    return createSuccessResponse("Leads fetched successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

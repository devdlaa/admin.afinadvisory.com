import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";



import { createLeadPipeline,listLeadPipelines } from "@/services/leadsManager/LeadPipelineAndStages.service";

export async function GET(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadpipeline.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.leadPipeline.list.parse({
      company_profile_id: searchParams.get("company_profile_id") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const pipelines = await listLeadPipelines(filters, admin_user.id);

    return createSuccessResponse(
      "Lead pipelines retrieved successfully",
      pipelines,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadpipeline.manage",
    );
    if (permissionError) return permissionError;

    const body = schemas.leadPipeline.create.parse(await req.json());

    const pipeline = await createLeadPipeline(body, admin_user.id);

    return createSuccessResponse(
      "Lead pipeline created successfully",
      pipeline,
      201,
    );
  } catch (e) {
    
    return handleApiError(e);
  }
}

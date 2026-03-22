import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";


import { updateLeadPipeline,deleteLeadPipeline,getLeadPipelineById } from "@/services/leadsManager/LeadPipelineAndStages.service";


export async function GET(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadpipeline.access",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadPipeline.id.parse(await params);

    const pipeline = await getLeadPipelineById(id, admin_user.id);

    return createSuccessResponse(
      "Lead pipeline retrieved successfully",
      pipeline,
    );
  } catch (e) {
    return handleApiError(e);
  }
}


export async function PATCH(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadpipeline.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadPipeline.id.parse(await params);

    const body = schemas.leadPipeline.update.parse(await req.json());

    const pipeline = await updateLeadPipeline(id, body, admin_user.id);

    return createSuccessResponse(
      "Lead pipeline updated successfully",
      pipeline,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadpipeline.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadPipeline.id.parse(await params);

    const result = await deleteLeadPipeline(id, admin_user.id);

    return createSuccessResponse("Lead pipeline deleted successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

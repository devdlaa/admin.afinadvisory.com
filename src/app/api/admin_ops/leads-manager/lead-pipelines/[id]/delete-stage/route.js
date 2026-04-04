import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { deleteLeadPipelineStage } from "@/services/leadsManager/LeadPipelineAndStages.service";

export async function POST(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadpipeline.delete",
    );
    if (permissionError) return permissionError;

    const { id } = await params; 

    const body = schemas.leadPipeline.deleteStage.parse(await req.json());

    const result = await deleteLeadPipelineStage(id, body, admin_user.id);

    return createSuccessResponse(
      "Stage deleted and leads migrated successfully",
      result,
    );
  } catch (e) {
  
    return handleApiError(e);
  }
}

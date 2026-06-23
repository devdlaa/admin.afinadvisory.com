import { updateLeadStage } from "@/services/leadsManager/leadCore.service";
import { schemas } from "@/schemas";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

/* ----------------------------------------
PATCH /leads/:lead_id/update-stage
---------------------------------------- */

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const { leadId: lead_id } = await params;

    const body = await request.json();
    const payload = schemas.lead.stage.parse(body);

    const result = await updateLeadStage(lead_id, payload, admin_user);

    return createSuccessResponse("Lead stage updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

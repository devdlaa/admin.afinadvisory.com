import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  getLeadDetails,
  updateLead,
  deleteLead,
} from "@/services/leadsManager/leadCore.service";

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { leadId: id } = await params;
    const parsed = schemas.lead.get.parse({ id: id });

    const result = await getLeadDetails(parsed.id, admin_user);

    return createSuccessResponse("Lead fetched successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const { leadId } = await params;
    const body = await request.json();

    const parsedParams = schemas.lead.params.parse({
      id: leadId,
    });
    const parsedBody = schemas.lead.update.parse(body);

    const result = await updateLead(parsedParams.id, parsedBody, admin_user);

    return createSuccessResponse("Lead updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const { leadId } = await params;

    const result = await deleteLead(leadId, admin_user);

    return createSuccessResponse("Lead deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

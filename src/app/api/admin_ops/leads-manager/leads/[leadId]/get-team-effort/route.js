import { getLeadTeamEffort } from "@/services/leadsManager/analytics/analytics.core.service";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { leadId } = await params;

    const result = await getLeadTeamEffort(leadId, admin_user);

    return createSuccessResponse("Team effort retrieved successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

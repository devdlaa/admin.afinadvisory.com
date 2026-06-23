import { getLeadAiSummary } from "@/services/leadsManager/analytics/lead_is_summry_beta";
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

    const result = await getLeadAiSummary(leadId, admin_user);

    return createSuccessResponse("AI summary retrieved successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

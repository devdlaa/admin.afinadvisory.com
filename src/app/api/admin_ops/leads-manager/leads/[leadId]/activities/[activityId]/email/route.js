import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";
import {
  getActivityEmail,
  updateActivityEmail,
} from "@/services/lead/leadActivity.service";
import {
  getLeadActivityEmailContent,
  updateLeadActivityEmailContent,
} from "@/services/leadsManager/leadsActivity.service";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "leads.access");
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.leadActivity.id.parse({
      params: resolvedParams,
    });

    const result = await getLeadActivityEmailContent(parsed.params.id);

    return createSuccessResponse("Email fetched successfully", result);
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

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.leadActivity.email.parse({
      params: resolvedParams,
      body,
    });

    const result = await updateLeadActivityEmailContent(
      parsed.params.id,
      parsed.body,
      admin_user,
    );

    return createSuccessResponse("Email updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

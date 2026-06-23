import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  getLeadActivityEmailContent,
  updateLeadActivityEmailContent,
} from "@/services/leadsManager/leadsActivity.service";

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const result = await getLeadActivityEmailContent(
      resolvedParams.activityId,
      admin_user,
    );

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

    const parsed = schemas.leadActivity.updateEmail.parse(body);

    const result = await updateLeadActivityEmailContent(
      resolvedParams.activityId,
      parsed,
      admin_user,
    );

    return createSuccessResponse("Email updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

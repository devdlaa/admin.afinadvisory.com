import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  updateLeadActivity,
  getLeadActivityDetails,deleteLeadActivity
} from "@/services/leadsManager/leadsActivity.service";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "leads.view");
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.leadActivity.id.parse({
      params: resolvedParams,
    });

    const result = await getLeadActivityDetails(parsed.params.id);

    return createSuccessResponse("Activity fetched successfully", result);
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

    const parsed = schemas.leadActivity.update.parse({
      params: resolvedParams,
      body,
    });

    const result = await updateLeadActivity(
      parsed.params.id,
      parsed.body,
      admin_user,
    );

    return createSuccessResponse("Activity updated successfully", result);
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

    const resolvedParams = await params;

    const parsed = schemas.leadActivity.activityId.parse({
      params: resolvedParams,
    });

    const result = await deleteLeadActivity(parsed.params.id, admin_user);

    return createSuccessResponse("Activity deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

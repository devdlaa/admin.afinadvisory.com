import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import { updateActivityLifecycle } from "@/services/leadsManager/leadsActivity.service";
export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.leadActivity.lifecycle.parse(body);

    const result = await updateActivityLifecycle(
      resolvedParams.activityId,
      parsed,
      admin_user,
    );

    return createSuccessResponse(
      "Activity lifecycle updated successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

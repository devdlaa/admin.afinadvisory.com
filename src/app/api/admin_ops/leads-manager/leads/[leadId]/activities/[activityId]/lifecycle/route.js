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
      "lead.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.leadActivity.lifecycle.parse({
      params: resolvedParams,
      body,
    });

    const result = await updateActivityLifecycle(
      parsed.params.id,
      parsed.body,
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

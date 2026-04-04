import { schemas } from "@/schemas";
import { getEntityOutstandingBreakdown } from "@/services/task/reconcile.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "reconcile.manage",
    );
    if (permissionError) return permissionError;

    // Validate entity ID
    const { entityId } = params;
    
    const parsedId = schemas.outstanding.entityBreakdown.parse({
      entity_id: entityId,
    });

    const result = await getEntityOutstandingBreakdown(parsedId.entity_id);

    return createSuccessResponse(
      "Entity breakdown retrieved successfully",
      result,
    );
  } catch (e) {
    return handleApiError(e);
  }
}
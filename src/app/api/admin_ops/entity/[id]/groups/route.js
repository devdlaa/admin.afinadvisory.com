import { getEntityGroups } from "@/services_backup/entity/entity-group-member.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * GET /api/entities/:id/groups
 * Get entity's groups
 */
export async function GET(req, { params }) {
  try {
    const groups = await getEntityGroups(params.id);
    return createSuccessResponse("Entity groups retrieved successfully", groups);
  } catch (e) {
    return handleApiError(e);
  }
}
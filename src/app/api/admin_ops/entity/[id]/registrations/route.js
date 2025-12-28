import { getEntityRegistrations } from "@/services_backup/entity/entity-registration.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * GET /api/entities/:id/registrations
 * Get entity's registrations
 */
export async function GET(req, { params }) {
  try {
    const registrations = await getEntityRegistrations(params.id);
    return createSuccessResponse(
      "Entity registrations retrieved successfully",
      registrations
    );
  } catch (e) {
    return handleApiError(e);
  }
}

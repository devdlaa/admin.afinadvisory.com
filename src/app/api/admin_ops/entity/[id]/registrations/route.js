import { uuidSchema } from "@/schemas";

import { listEntityRegistrations } from "@/services/entity/entity-registration.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req, { params }) {
  try {
    const [permissionError] = await requirePermission(req, "entities.access");
    if (permissionError) return permissionError;

    const entity_id = uuidSchema.parse(params.entity_id);

    const data = await listEntityRegistrations(entity_id);

    return createSuccessResponse(
      "Entity registrations retrieved successfully",
      data
    );
  } catch (e) {
    return handleApiError(e);
  }
}

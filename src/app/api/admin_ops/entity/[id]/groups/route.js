import { uuidSchema } from "@/schemas";

import { getEntityGroupsByEntityId } from "@/services/entity/entity-group.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req, { params }) {
  try {
    const [permissionError] = await requirePermission(req, "entities.access");
    if (permissionError) return permissionError;

    const entity_id = uuidSchema.parse(params.id);

    const groups = await getEntityGroupsByEntityId(entity_id);

    return createSuccessResponse(
      "Entity groups retrieved successfully",
      groups
    );
  } catch (e) {
    return handleApiError(e);
  }
}

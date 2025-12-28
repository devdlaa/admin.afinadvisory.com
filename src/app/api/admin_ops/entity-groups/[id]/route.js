import { schemas } from "@/schemas";
import {
  getEntityGroupById,
  updateEntityGroup,
  deleteEntityGroup,
} from "@/services_backup/entity/entity-group.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * GET /api/entity-groups/:id
 * Get entity group by ID
 */
export async function GET(req, { params }) {
  try {
    const group = await getEntityGroupById(params.id);
    return createSuccessResponse("Entity group retrieved successfully", group);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PUT /api/entity-groups/:id
 * Update entity group
 */
export async function PUT(req, { params }) {
  try {
    const body = schemas.entityGroup.update.parse(await req.json());
    const group = await updateEntityGroup(params.id, body);

    return createSuccessResponse("Entity group updated successfully", group);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/entity-groups/:id
 * Delete entity group
 */
export async function DELETE(req, { params }) {
  try {
    const group = await deleteEntityGroup(params.id);
    return createSuccessResponse("Entity group deleted successfully", group);
  } catch (e) {
    return handleApiError(e);
  }
}

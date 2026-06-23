import { schemas, uuidSchema } from "@/schemas";

import {
  getEntityById,
  updateEntity,
  deleteEntity,
} from "@/services/entity/entity.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req, { params }) {
  try {
    const [permissionError] = await requirePermission(req, "entities.access");
    if (permissionError) return permissionError;
    const { id } = await params;
    const entity_id = uuidSchema.parse(id);

    const entity = await getEntityById(entity_id);

    return createSuccessResponse("Entity retrieved successfully", entity);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PUT /api/entities/:id
 * Update entity
 */
export async function PUT(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "entities.manage",
    );
    if (permissionError) return permissionError;
    const { id } = await params;
    const entity_id = uuidSchema.parse(id);

    // uses conditional PAN rule already baked into schema
    const body = schemas.entity.update.parse(await req.json());

    const entity = await updateEntity(entity_id, body, admin_user.id);

    return createSuccessResponse("Entity updated successfully", entity);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/entities/:id
 * Soft delete entity
 */
export async function DELETE(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "entities.delete",
    );
    if (permissionError) return permissionError;
    const { id } = await params;
    const entity_id = uuidSchema.parse(id);

    const entity = await deleteEntity(entity_id, admin_user.id);

    return createSuccessResponse("Entity deleted successfully", entity);
  } catch (e) {
    return handleApiError(e);
  }
}

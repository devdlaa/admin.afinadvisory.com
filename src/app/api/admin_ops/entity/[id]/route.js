import { schemas } from "@/schemas";
import { getEntityById, updateEntity, deleteEntity } from "@/services_backup/entity/entity.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * GET /api/entities/:id
 * Get entity by ID
 */
export async function GET(req, { params }) {
  try {
    const entity = await getEntityById(params.id);
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
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = schemas.entity.update.parse(await req.json());
    const entity = await updateEntity(params.id, body, session.user_id);

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
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const entity = await deleteEntity(params.id, session.user_id);
    return createSuccessResponse("Entity deleted successfully", entity);
  } catch (e) {
    return handleApiError(e);
  }
}
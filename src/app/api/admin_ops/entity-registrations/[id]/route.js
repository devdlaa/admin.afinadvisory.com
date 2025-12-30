import { schemas, uuidSchema } from "@/schemas";

import {
  updateEntityRegistration,
  deleteEntityRegistration,
} from "@/services/entity/entity-registration.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

/**
 * PUT /api/entity-registrations/:id
 * Update entity registration
 */
export async function PUT(req, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "entity_registrations.manage"
    );
    if (permissionError) return permissionError;

    // validate id format
    const entity_registration_id = uuidSchema.parse(params.id);

    // validate body using central update schema
    const body = schemas.entityRegistration.update.parse(await req.json());

    const registration = await updateEntityRegistration(
      entity_registration_id,
      body,
      session.user.id
    );

    return createSuccessResponse(
      "Entity registration updated successfully",
      registration
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/entity-registrations/:id
 * Soft delete entity registration
 */
export async function DELETE(req, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "entity_registrations.delete"
    );
    if (permissionError) return permissionError;

    const entity_registration_id = uuidSchema.parse(params.id);

    const registration = await deleteEntityRegistration(
      entity_registration_id,
      session.user.id
    );

    return createSuccessResponse(
      "Entity registration deleted successfully",
      registration
    );
  } catch (e) {
    return handleApiError(e);
  }
}

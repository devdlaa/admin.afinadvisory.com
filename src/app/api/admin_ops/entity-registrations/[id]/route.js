import { schemas } from "@/schemas";
import { updateEntityRegistration, deleteEntityRegistration } from "@/services_backup/entity/entity-registration.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * PUT /api/entity-registrations/:id
 * Update entity registration
 */
export async function PUT(req, { params }) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = schemas.entityRegistration.update.parse(await req.json());
    const registration = await updateEntityRegistration(params.id, body, session.user_id);

    return createSuccessResponse("Entity registration updated successfully", registration);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/entity-registrations/:id
 * Delete entity registration
 */
export async function DELETE(req, { params }) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const registration = await deleteEntityRegistration(params.id, session.user_id);
    return createSuccessResponse("Entity registration deleted successfully", registration);
  } catch (e) {
    return handleApiError(e);
  }
}
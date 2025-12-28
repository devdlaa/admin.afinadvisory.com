import { schemas } from "@/schemas";
import {
  getRegistrationTypeById,
  updateRegistrationType,
  deleteRegistrationType,
} from "@/services_backup/entity/registration-type.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * GET /api/registration-types/:id
 * Get registration type by ID
 */
export async function GET(req, { params }) {
  try {
    const regType = await getRegistrationTypeById(params.id);
    return createSuccessResponse(
      "Registration type retrieved successfully",
      regType
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PUT /api/registration-types/:id
 * Update registration type
 */
export async function PUT(req, { params }) {
  try {
    const body = schemas.registrationType.update.parse(await req.json());
    const regType = await updateRegistrationType(params.id, body);

    return createSuccessResponse(
      "Registration type updated successfully",
      regType
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/registration-types/:id
 * Delete registration type
 */
export async function DELETE(req, { params }) {
  try {
    const regType = await deleteRegistrationType(params.id);
    return createSuccessResponse(
      "Registration type deleted successfully",
      regType
    );
  } catch (e) {
    return handleApiError(e);
  }
}

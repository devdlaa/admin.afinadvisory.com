import {
  getRegistrationTypeById,
  updateRegistrationType,
  deleteRegistrationType,
} from "@/services/entity/registration-type.service";

import { schemas, uuidSchema } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// GET → single registration type
export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "registration_types.access"
    );
    if (permissionError) return permissionError;

    const id = uuidSchema.parse(params.id);

    const regType = await getRegistrationTypeById(id);

    return createSuccessResponse(
      "Registration type retrieved successfully",
      regType
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT → update registration type
export async function PUT(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "registration_types.manage"
    );
    if (permissionError) return permissionError;

    const id = uuidSchema.parse(params.id);

    const body = await request.json();

    const validated = schemas.registrationType.update.parse(body);

    if (Object.keys(validated).length === 0) {
      return createErrorResponse(
        "At least one field must be provided for update",
        400,
        "NO_FIELDS"
      );
    }

    const regType = await updateRegistrationType(id, validated);

    return createSuccessResponse(
      "Registration type updated successfully",
      regType
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE → delete registration type
export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "registration_types.manage"
    );
    if (permissionError) return permissionError;

    const id = uuidSchema.parse(params.id);

    const regType = await deleteRegistrationType(id);

    return createSuccessResponse(
      "Registration type deleted successfully",
      regType
    );
  } catch (error) {
    return handleApiError(error);
  }
}

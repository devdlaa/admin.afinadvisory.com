import { schemas } from "@/schemas";

import {
  createRegistrationType,
  listRegistrationTypes,
} from "@/services/entity/registration-type.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * POST /api/registration-types
 * Create registration type
 */
export async function POST(req) {
  try {
    const body = schemas.registrationType.create.parse(await req.json());
    const regType = await createRegistrationType(body);

    return createSuccessResponse(
      "Registration type created successfully",
      regType,
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * GET /api/registration-types
 * List registration types
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = schemas.registrationType.list.parse({
      is_active: searchParams.get("is_active") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const regTypes = await listRegistrationTypes(filters);

    return createSuccessResponse(
      "Registration types retrieved successfully",
      regTypes
    );
  } catch (e) {
    return handleApiError(e);
  }
}

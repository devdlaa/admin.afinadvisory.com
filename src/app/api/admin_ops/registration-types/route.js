import {
  createRegistrationType,
  listRegistrationTypes,
} from "@/services/entity/registration-type.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";


export async function POST(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "registration_types.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.registrationType.create.parse(body);

    const regType = await createRegistrationType(validated);

    return createSuccessResponse(
      "Registration type created successfully",
      regType,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}


export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "registration_types.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

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
  } catch (error) {
    return handleApiError(error);
  }
}

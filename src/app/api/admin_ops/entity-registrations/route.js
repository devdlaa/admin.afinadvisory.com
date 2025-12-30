import { schemas } from "@/schemas";
import { createEntityRegistration } from "@/services/entity/entity-registration.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

/**
 * POST /api/entity-registrations
 * Create entity registration
 */
export async function POST(req) {
  try {
    // Permission gate
    const [permissionError, session] = await requirePermission(
      req,
      "entity_registrations.manage"
    );
    if (permissionError) return permissionError;

    // validate payload with central schema
    const body = schemas.entityRegistration.create.parse(await req.json());

    // service writes created_by from session
    const registration = await createEntityRegistration(body, session.user.id);

    return createSuccessResponse(
      "Entity registration created successfully",
      registration,
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}

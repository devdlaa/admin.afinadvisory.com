import { schemas } from "@/schemas";
import { createEntityRegistration } from "@/services_backup/entity/entity-registration.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * POST /api/entity-registrations
 * Create entity registration
 */
export async function POST(req) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = schemas.entityRegistration.create.parse(await req.json());
    const registration = await createEntityRegistration(body, session.user_id);

    return createSuccessResponse("Entity registration created successfully", registration, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
import { schemas } from "@/schemas";
import { createEntity, listEntities } from "@/services_backup/entity/entity.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * POST /api/entities
 * Create new entity
 */
export async function POST(req) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = schemas.entity.create.parse(await req.json());
    const entity = await createEntity(body, session.user_id);

    return createSuccessResponse("Entity created successfully", entity, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * GET /api/entities
 * List entities with filters
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = schemas.entity.query.parse({
      entity_type: searchParams.get("entity_type") || undefined,
      status: searchParams.get("status") || undefined,
      is_retainer: searchParams.get("is_retainer") === "true" ? true : searchParams.get("is_retainer") === "false" ? false : undefined,
      state: searchParams.get("state") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    const entities = await listEntities(filters);

    return createSuccessResponse("Entities retrieved successfully", entities);
  } catch (e) {
    return handleApiError(e);
  }
}

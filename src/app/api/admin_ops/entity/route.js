import { schemas } from "@/schemas";
import { createEntity, listEntities } from "@/services/entity/entity.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "entities.manage"
    );
    if (permissionError) return permissionError;

    // validate body
    const body = schemas.entity.create.parse(await req.json());

    const entity = await createEntity(body, session.user.id);

    return createSuccessResponse("Entity created successfully", entity, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req, "entities.access");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    // use centralized query schema
    const filters = schemas.entity.query.parse({
      entity_type: searchParams.get("entity_type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      is_retainer:
        searchParams.get("is_retainer") === "true"
          ? true
          : searchParams.get("is_retainer") === "false"
          ? false
          : undefined,
      state: searchParams.get("state") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const entities = await listEntities(filters);

    return createSuccessResponse("Entities retrieved successfully", entities);
  } catch (e) {
    return handleApiError(e);
  }
}

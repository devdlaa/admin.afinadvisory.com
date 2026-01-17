import { schemas } from "@/schemas";
import { createEntity, listEntities } from "@/services/entity/entity.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      req,
      "entities.manage"
    );
    if (permissionError) return permissionError;

    const body = schemas.entity.create.parse(await req.json());

    const entity = await createEntity(body, admin_user.id);

    return createSuccessResponse("Entity created successfully", entity, 201);
  } catch (e) {
    console.log(e)
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
      state: searchParams.get("state") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const entities = await listEntities(filters);

    return createSuccessResponse("Entities retrieved successfully", entities);
  } catch (e) {
    return handleApiError(e);
  }
}

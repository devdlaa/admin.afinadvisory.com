import { schemas } from "@/schemas";

import { createEntityGroup,listEntityGroups } from "@/services_backup/entity/entity-group.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * POST /api/entity-groups
 * Create entity group
 */
export async function POST(req) {
  try {
    const body = schemas.entityGroup.create.parse(await req.json());
    const group = await createEntityGroup(body);

    return createSuccessResponse(
      "Entity group created successfully",
      group,
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * GET /api/entity-groups
 * List entity groups
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      group_type: searchParams.get("group_type") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const groups = await listEntityGroups(filters);

    return createSuccessResponse(
      "Entity groups retrieved successfully",
      groups
    );
  } catch (e) {
    return handleApiError(e);
  }
}

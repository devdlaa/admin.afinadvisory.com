import { schemas } from "@/schemas";

import {
  createEntityGroup,
  listEntityGroups,
} from "@/services/entity/entity-group.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// POST → create entity group
export async function POST(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.entityGroup.create.parse(body);

    const group = await createEntityGroup(validated);

    return createSuccessResponse(
      "Entity group created successfully",
      group,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// GET → list entity groups
export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const validated = schemas.entityGroup.list.parse({
      search: searchParams.get("search") ?? undefined,
      group_type: searchParams.get("group_type") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const groups = await listEntityGroups(validated);

    return createSuccessResponse(
      "Entity groups retrieved successfully",
      groups
    );
  } catch (error) {
    return handleApiError(error);
  }
}

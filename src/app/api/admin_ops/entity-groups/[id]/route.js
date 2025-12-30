import { schemas, uuidSchema } from "@/schemas";

import {
  updateEntityGroup,
  deleteEntityGroup,
  getEntityGroupById,
} from "@/services/entity/entity-group.service";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// GET → single entity group
export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.access"
    );
    if (permissionError) return permissionError;

    const entity_group_id = uuidSchema.parse(params.id);

    const group = await getEntityGroupById(entity_group_id);

    return createSuccessResponse("Entity group retrieved successfully", group);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT → update entity group
export async function PUT(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.manage"
    );
    if (permissionError) return permissionError;

    const entity_group_id = uuidSchema.parse(params.id);

    const body = await request.json();

    const validated = schemas.entityGroup.update.parse(body);

    const group = await updateEntityGroup(entity_group_id, validated);

    return createSuccessResponse("Entity group updated successfully", group);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE → delete entity group
export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.manage"
    );
    if (permissionError) return permissionError;

    const entity_group_id = uuidSchema.parse(params.id);

    const group = await deleteEntityGroup(entity_group_id);

    return createSuccessResponse("Entity group deleted successfully", group);
  } catch (error) {
    return handleApiError(error);
  }
}

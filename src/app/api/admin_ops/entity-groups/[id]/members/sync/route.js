import { schemas } from "@/schemas";

import { syncGroupMembers } from "@/services/entity/entity-group-member.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// PUT → sync members (add/remove/replace)
export async function PUT(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.entityGroup.syncMember.parse({
      entity_group_id: params.id,
      members: body.members,
    });

    const result = await syncGroupMembers(
      validated.entity_group_id,
      validated.members
    );

    return createSuccessResponse("Group members synced successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

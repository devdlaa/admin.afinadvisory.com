import { uuidSchema } from "@/schemas";

import { listGroupMembers } from "@/services/entity/entity-group-member.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "entity_groups.access"
    );
    if (permissionError) return permissionError;

    const entity_group_id = uuidSchema.parse(params.id);

    const members = await listGroupMembers(entity_group_id);

    return createSuccessResponse(
      "Group members retrieved successfully",
      members
    );
  } catch (error) {
    return handleApiError(error);
  }
}

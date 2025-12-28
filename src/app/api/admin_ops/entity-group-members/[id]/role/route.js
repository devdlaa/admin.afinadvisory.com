import { schemas } from "@/schemas";

import { updateMemberRole } from "@/services/entity/entity-group-member.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * PATCH /api/entity-group-members/:id/role
 * Update member role
 */
export async function PATCH(req, { params }) {
  try {
    const body = z
      .object({
        role: schemas.entityGroup.enums.role,
      })
      .parse(await req.json());

    const member = await updateMemberRole(params.id, body.role);

    return createSuccessResponse("Member role updated successfully", member);
  } catch (e) {
    return handleApiError(e);
  }
}

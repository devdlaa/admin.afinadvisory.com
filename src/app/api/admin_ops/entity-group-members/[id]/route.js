import { removeMemberFromGroup } from "@/services_backup/entity/entity-group-member.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";


export async function DELETE(req, { params }) {
  try {
    const member = await removeMemberFromGroup(params.id);
    return createSuccessResponse("Member removed successfully", member);
  } catch (e) {
    return handleApiError(e);
  }
}
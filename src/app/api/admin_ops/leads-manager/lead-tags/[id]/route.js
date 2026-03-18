import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { updateLeadTag, deleteLeadTag } from "@/services/leads/leadTag.service";

export async function PATCH(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadtag.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadTag.id.parse(params);

    const body = schemas.leadTag.update.parse(await req.json());

    const tag = await updateLeadTag(id, body, admin_user.id);

    return createSuccessResponse("Lead tag updated successfully", tag);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadtag.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadTag.id.parse(params);

    const result = await deleteLeadTag(id, admin_user.id);

    return createSuccessResponse("Lead tag deleted successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

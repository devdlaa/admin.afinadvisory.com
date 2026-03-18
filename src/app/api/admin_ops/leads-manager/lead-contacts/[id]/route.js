import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

import {
  getLeadContactById,
  updateLeadContact,
  deleteLeadContact,
} from "@/services/leads/leadContact.service";

export async function GET(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadcontact.view",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadContact.id.parse(params);

    const contact = await getLeadContactById(id, admin_user.id);

    return createSuccessResponse(
      "Lead contact retrieved successfully",
      contact,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadcontact.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadContact.id.parse(params);

    const body = schemas.leadContact.update.parse(await req.json());

    const contact = await updateLeadContact(id, body, admin_user.id);

    return createSuccessResponse("Lead contact updated successfully", contact);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadcontact.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadContact.id.parse(params);

    const result = await deleteLeadContact(id, admin_user.id);

    return createSuccessResponse("Lead contact deleted successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

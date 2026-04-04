import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

import {
  updateLeadContact,
  deleteLeadContact,
  getLeadContactById,
} from "@/services/leadsManager/leadContacts.service";

export async function GET(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leads.contact.access",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadContact.id.parse(await params);

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
      "leads.contact.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadContact.id.parse(await params);

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
      "leads.contact.delete",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.leadContact.id.parse(await params);

    const result = await deleteLeadContact(id, admin_user.id);

    return createSuccessResponse("Lead contact deleted successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

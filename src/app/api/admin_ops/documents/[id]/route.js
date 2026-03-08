import { schemas } from "@/schemas";
import {
  deleteDocumentService,
  renameDocumentService,
} from "@/services/shared/storage.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function DELETE(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;

    const parsed = schemas.document.delete.parse({ id: params.id });

    const result = await deleteDocumentService({
      documentId: parsed.id,
      currentUserId: admin_user.id,
    });

    return createSuccessResponse("Document deleted successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;
    const { id } = await params;
    const body = await req.json();
    const parsed = schemas.document.rename.parse({ id, ...body });

    const result = await renameDocumentService({
      documentId: parsed.id,
      newName: parsed.name,
      currentUserId: admin_user.id,
    });

    return createSuccessResponse("Document renamed successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

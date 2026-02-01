import { schemas } from "@/schemas";

import { deleteDocumentService } from "@/services/shared/storage.service";
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

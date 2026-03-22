import {
  updateComment,
  deleteComment,
} from "@/services/shared/comments.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { lead_id, id: comment_id } = params;
    const body = await request.json();

    const validatedData = schemas.comments.update.parse(body);

    const updatedComment = await updateComment(
      "LEAD",
      lead_id,
      comment_id,
      admin_user.id,
      validatedData.message,
      validatedData.mentions,
      validatedData.is_private,
    );

    return createSuccessResponse(
      "Comment updated successfully",
      updatedComment,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const { lead_id, id: comment_id } = params;

    await deleteComment("LEAD", lead_id, comment_id, admin_user.id);

    return createSuccessResponse("Comment deleted successfully", {
      deleted: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

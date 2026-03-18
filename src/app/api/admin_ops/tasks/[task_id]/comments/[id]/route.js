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
      "tasks.access",
    );
    if (permissionError) return permissionError;

    const { task_id, id: comment_id } = params;
    const body = await request.json();

    const validatedData = schemas.comments.update.parse(body);

    const updatedComment = await updateComment(
      "TASK",
      task_id,
      comment_id,
      admin_user.id,
      validatedData.message,
      validatedData.mentions,
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
      "tasks.access",
    );
    if (permissionError) return permissionError;

    const { task_id, id: comment_id } = params;

    await deleteComment("TASK", task_id, comment_id, admin_user.id);

    return createSuccessResponse("Comment deleted successfully", {
      deleted: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import {
  updateTaskComment,
  deleteTaskComment,
} from "@/services/task/taskComment.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.access"
    );
    if (permissionError) return permissionError;

    const { task_id, id: comment_id } = params;
    const body = await request.json();

    const validatedData = schemas.taskComment.update.parse(body);

    const updatedComment = await updateTaskComment(
      task_id,
      comment_id,
      session.user.id,
      validatedData.message,
      validatedData.mentions
    );

    return createSuccessResponse(
      "Comment updated successfully",
      updatedComment
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.access"
    );
    if (permissionError) return permissionError;

    const { task_id, id: comment_id } = params;

    await deleteTaskComment(task_id, comment_id, session.user.id);

    return createSuccessResponse("Comment deleted successfully", {
      deleted: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

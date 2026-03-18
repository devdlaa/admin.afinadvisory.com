import {
  createComment,
  listTimeline,
} from "@/services/shared/comments.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function POST(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "tasks.access",
    );
    if (permissionError) return permissionError;

    const { task_id } = params;
    const body = await request.json();

    const validatedData = schemas.comments.create.parse(body);

    const comment = await createComment(
      "TASK",
      task_id,
      admin_user.id,
      validatedData.message,
      validatedData.mentions,
      false,
    );

    return createSuccessResponse("Comment created successfully", comment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET - List comments/timeline for a task
export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "tasks.access",
    );
    if (permissionError) return permissionError;

    const { task_id } = params;
    const { searchParams } = new URL(request.url);

    const queryParams = {
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
      type: searchParams.get("type"),
      user_id: searchParams.get("user_id"),
    };

    const validatedParams = schemas.comments.query.parse({
      ...queryParams,
      task_id,
    });

    const result = await listTimeline(
      "TASK",
      task_id,
      {
        limit: validatedParams.limit,
        cursor: validatedParams.cursor,
        type: validatedParams.type,
        user_id: queryParams.user_id || null,
      },
      admin_user,
    );

    return createSuccessResponse("Comments retrieved successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

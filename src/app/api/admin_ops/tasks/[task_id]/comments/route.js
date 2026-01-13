import {
  createTaskComment,
  listTaskTimeline,
} from "@/services/task/taskComment.service";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function POST(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.access"
    );
    if (permissionError) return permissionError;

    const { task_id } = params;
    const body = await request.json();

    const validatedData = schemas.taskComment.create.parse(body);

    const comment = await createTaskComment(
      task_id,
      session.user.id,
      validatedData.message,
      validatedData.mentions
    );

    return createSuccessResponse("Comment created successfully", comment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET - List comments/timeline for a task
export async function GET(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.access"
    );
    if (permissionError) return permissionError;

    const { task_id } = await params;
    const { searchParams } = new URL(request.url);

    const queryParams = {
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
      type: searchParams.get("type"),
    };

    const validatedParams = schemas.taskComment.query.parse({
      ...queryParams,
      task_id,
    });

    const result = await listTaskTimeline(
      task_id,
      {
        limit: validatedParams.limit,
        cursor: validatedParams.cursor,
        type: validatedParams.type,
      },
      session.user
    );

    return createSuccessResponse("Comments retrieved successfully", result);
  } catch (error) {
    console.log("error", error);
    return handleApiError(error);
  }
}

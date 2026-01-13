import { createTask, listTasks } from "@/services/task/task.service";

import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

// POST - Create a new task
export async function POST(request) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validatedData = schemas.task.create.parse(body);

    const task = await createTask(validatedData, session.user.id);

    return createSuccessResponse("Task created successfully", task, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET - List all tasks with filters and pagination
export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const params = {
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),

      entity_id: searchParams.get("entity_id"),
      status: searchParams.get("status"),
      priority: searchParams.get("priority"),
      task_category_id: searchParams.get("task_category_id"),

      created_by: searchParams.get("created_by"),
      assigned_to: searchParams.get("assigned_to"),

      due_date_from: searchParams.get("due_date_from"),
      due_date_to: searchParams.get("due_date_to"),

      search: searchParams.get("search"),

      is_billable: searchParams.get("is_billable"),
      billed_from_firm: searchParams.get("billed_from_firm"),

      sort_by: searchParams.get("sort_by"),
      sort_order: searchParams.get("sort_order"),
    };

    if (params.is_billable === "true") params.is_billable = true;
    else if (params.is_billable === "false") params.is_billable = false;
    else delete params.is_billable;

    Object.keys(params).forEach(
      (key) => params[key] === null && delete params[key]
    );

    const validatedParams = schemas.task.query.parse(params);

    const result = await listTasks(validatedParams, session.user);

    return createSuccessResponse("Tasks retrieved successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

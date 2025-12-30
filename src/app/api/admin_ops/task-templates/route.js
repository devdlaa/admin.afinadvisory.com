import { schemas } from "@/schemas";

import {
  createTaskTemplate,
  listTaskTemplates,
} from "@/services/task/taskTemplate.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "task_templates.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.taskTemplate.create.parse(body);

    const template = await createTaskTemplate(validated, session.user.id);

    return createSuccessResponse(
      "Task template created successfully",
      template,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_templates.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const validated = schemas.taskTemplate.list.parse({
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
      is_active: searchParams.get("is_active") ?? undefined,
      compliance_rule_id: searchParams.get("compliance_rule_id") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const result = await listTaskTemplates(validated);

    return createSuccessResponse(
      "Task templates retrieved successfully",
      result
    );
  } catch (error) {
    return handleApiError(error);
  }
}

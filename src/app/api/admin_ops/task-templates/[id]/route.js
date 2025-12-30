import { schemas, uuidSchema } from "@/schemas";

import {
  getTaskTemplateById,
  updateTaskTemplate,
  deleteTaskTemplate,
} from "@/services/task/taskTemplate.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_templates.access"
    );
    if (permissionError) return permissionError;

    const template_id = uuidSchema.parse(params.id);

    const template = await getTaskTemplateById(template_id);

    return createSuccessResponse(
      "Task template retrieved successfully",
      template
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "task_templates.manage"
    );
    if (permissionError) return permissionError;

    const template_id = uuidSchema.parse(params.id);

    const body = await request.json();

    const validated = schemas.taskTemplate.update.parse(body);

    const template = await updateTaskTemplate(
      template_id,
      validated,
      session.user.id
    );

    return createSuccessResponse(
      "Task template updated successfully",
      template
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_templates.manage"
    );
    if (permissionError) return permissionError;

    const template_id = uuidSchema.parse(params.id);

    const result = await deleteTaskTemplate(template_id);

    return createSuccessResponse("Task template deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

import { schemas, uuidSchema } from "@/schemas";

import { syncTemplateModules } from "@/services/task/taskTemplateModule.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_templates.manage"
    );
    if (permissionError) return permissionError;

    const task_template_id = uuidSchema.parse(params.id);

    const body = await request.json();

    const { modules } = schemas.taskTemplate.modules.parse(body);

    const result = await syncTemplateModules(task_template_id, modules);

    return createSuccessResponse(
      "Template modules synced successfully",
      result
    );
  } catch (e) {
    return handleApiError(e);
  }
}

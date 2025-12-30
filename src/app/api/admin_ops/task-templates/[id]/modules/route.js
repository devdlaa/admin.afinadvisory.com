import { z } from "zod";
import { listTemplateModules } from "@/services/task/taskTemplateModule.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

const uuidSchema = z.string().uuid("Invalid task template id");
import { requirePermission } from "@/utils/server/requirePermission";
export async function GET(_req, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "task_templates.access"
    );
    if (permissionError) return permissionError;

    const task_template_id = uuidSchema.parse(params.id);

    const modules = await listTemplateModules(task_template_id);

    return createSuccessResponse(
      "Template modules retrieved successfully",
      modules
    );
  } catch (err) {
    // Service-level or unexpected error
    return handleApiError(err);
  }
}

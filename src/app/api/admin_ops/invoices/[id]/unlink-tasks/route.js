
import { unlinkTasksFromInvoice } from "@/services/task/invoicing.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";


export async function POST(request, { params }) {
  try {
    const [permissionError, session, adminUser] = await requirePermission(
      request,
   
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.invoice.unlinkTasks.parse({
      params: resolvedParams,
      body,
    });

    const result = await unlinkTasksFromInvoice(
      parsed.params.id,
      parsed.body.task_ids
    );

    return createSuccessResponse("Tasks unlinked successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

import { schemas } from "@/schemas";
import { markTasksNonBillable } from "@/services/task/reconcile.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [err, user] = await requirePermission(req);
    if (err) return err;

    const body = await req.json();
   
    const data = schemas.reconcile.markNonBillable.parse(body);

    const result = await markTasksNonBillable(data.task_ids, user);

    return createSuccessResponse("Tasks processed", result);
  } catch (e) {

    return handleApiError(e);
  }
}

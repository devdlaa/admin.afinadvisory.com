import { schemas } from "@/schemas";
import { markTasksNonBillable } from "@/services/task/reconcile.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "reconcile.manage",
    );
    if (permissionError) return permissionError;

    const body = await req.json();

    const data = schemas.reconcile.markNonBillable.parse(body);

    const result = await markTasksNonBillable(data.task_ids, user);

    return createSuccessResponse("Tasks processed", result);
  } catch (e) {
    return handleApiError(e);
  }
}

import { schemas } from "@/schemas";
import { restoreTasksBillable } from "@/services/task/reconcile.service";
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
    const data = schemas.reconcile.restoreBillable.parse(body);

    const result = await restoreTasksBillable(data.task_ids, admin_user);

    return createSuccessResponse("Tasks restored", result);
  } catch (e) {
    return handleApiError(e);
  }
}

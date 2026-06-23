import { schemas } from "@/schemas";
import { getNonBillableTasks } from "@/services/task/reconcile.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "reconcile.view",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.reconcile.nonBillable.parse({
      entity_id: searchParams.get("entity_id") ?? undefined,
      task_category_id: searchParams.get("task_category_id") ?? undefined,
      task_status: searchParams.get("task_status") ?? undefined,
      from_date: searchParams.get("from_date") ?? undefined,
      to_date: searchParams.get("to_date") ?? undefined,
      order: searchParams.get("order") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const data = await getNonBillableTasks(filters);

    return createSuccessResponse("Non-billable tasks retrieved", data);
  } catch (e) {
    return handleApiError(e);
  }
}

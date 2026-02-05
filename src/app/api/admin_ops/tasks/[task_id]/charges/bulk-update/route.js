import { bulkUpdateTaskCharges } from "@/services/task/taskChargesOverride.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      ["reconcile.manage", "invoice.manage"],
      "ANY",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.taskCharge.bulkTaskChargeUpdate.parse({
      params: resolvedParams,
      body,
    });

    const result = await bulkUpdateTaskCharges(
      parsed.params.task_id,
      parsed.body.updates,
      admin_user,
    );

    return createSuccessResponse("Charges updated successfully", result);
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
}

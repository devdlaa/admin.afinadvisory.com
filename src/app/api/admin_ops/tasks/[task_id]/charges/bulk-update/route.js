
import { bulkUpdateTaskCharges } from "@/services/task/taskChargesOverride.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(request);
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;
      console.log("resolvedParams",resolvedParams);
      console.log("body",body);

    const parsed = schemas.taskCharge.bulkTaskChargeUpdate.parse({
      params: resolvedParams,
      body,
    });

  

    const result = await bulkUpdateTaskCharges(
      parsed.params.task_id,
      parsed.body.updates,
      session.user,
    );

    return createSuccessResponse("Charges updated successfully", result);
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
}

import { schemas } from "@/schemas";

import { bulkUpdateChargesByChargeIds } from "@/services/task/taskChargesOverride.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "tasks.charge.manage",
    );
    if (permissionError) return permissionError;

    const body = schemas.taskCharge.bulkStatus.parse(await req.json());

    const result = await bulkUpdateChargesByChargeIds(
      body.charge_ids,
      body.status,
      admin_user,
    );

    return createSuccessResponse("Bulk status update successful", result);
  } catch (e) {
    return handleApiError(e);
  }
}

import { createTaskChargeOverride } from "@/services/task/taskChargesOverride.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { schemas } from "@/schemas";

export async function POST(request, { params }) {
  try {
    const [permissionError, session,admin_user] = await requirePermission(
      request,
      ["reconcile.manage", "invoice.manage"],
      "ANY",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.taskCharge.create.parse({
      params: resolvedParams,
      body,
    });

    const result = await createTaskChargeOverride(
      parsed.params.task_id,
      parsed.body,
      admin_user,
    );

    return createSuccessResponse("Charge added successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

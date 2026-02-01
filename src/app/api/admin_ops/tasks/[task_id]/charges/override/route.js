
import { createTaskChargeOverride } from "@/services/task/taskChargesOverride.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { schemas } from "@/schemas";

export async function POST(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,

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
      session.user,
    );

    return createSuccessResponse("Charge added successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

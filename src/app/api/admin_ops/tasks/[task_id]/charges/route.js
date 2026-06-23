import { createTaskCharge } from "@/services/task/taskCharge.service";
import { listTaskChargesLib } from "@/services/shared/taskChargeslib";
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
      "tasks.charge.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.taskCharge.create.parse({
      params: resolvedParams,
      body,
    });

    const result = await createTaskCharge(
      parsed.params.task_id,
      parsed.body,
      session.user,
    );

    return createSuccessResponse("Charge added successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "tasks.charge.manage",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.taskCharge.list.parse({
      params: resolvedParams,
    });

    const charges = await listTaskChargesLib(
      parsed.params.task_id,
      session.user,
    );

    return createSuccessResponse(
      "Task charges retrieved successfully",
      charges,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

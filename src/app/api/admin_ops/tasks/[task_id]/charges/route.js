import {
  createTaskCharge,
  listTaskCharges,
} from "@/services/task/taskCharge.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { schemas } from "@/schemas";

export async function POST(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "tasks.charge.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const parsed = schemas.taskCharge.create.parse({
      params,
      body,
    });

    const result = await createTaskCharge(parsed.params.taskId, {
      ...parsed.body,
    });

    return createSuccessResponse("Charge added successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request, "tasks.access");
    if (permissionError) return permissionError;

    const parsed = schemas.taskCharge.list.parse({
      params,
    });

    const charges = await listTaskCharges(parsed.params.taskId);

    return createSuccessResponse(
      "Task charges retrieved successfully",
      charges
    );
  } catch (error) {
    return handleApiError(error);
  }
}

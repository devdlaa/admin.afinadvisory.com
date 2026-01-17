import { fetchDeletedTaskCharges } from "@/services/task/taskCharge.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function GET(request, { params }) {
  try {
    const [, session, admin_user] = await requirePermission(request);

    const resolvedParams = await params;

    const parsed = schemas.taskCharge.list.parse({
      params: resolvedParams,
    });

    const charges = await fetchDeletedTaskCharges(parsed.params.task_id,admin_user);

    return createSuccessResponse(
      "Deleted task charges retrieved successfully",
      charges,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

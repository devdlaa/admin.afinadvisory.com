import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { schemas } from "@/schemas";
import {
  updatePermission,
  deletePermission,
} from "@/services/admin/permission.service";

export async function PATCH(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request);
    if (permissionError) return permissionError;

    const body = await request.json();
    const parsed = schemas.permission.update.parse({
      params,
      body,
    });

    const result = await updatePermission(parsed.params.id, parsed.body);

    return createSuccessResponse("Permission updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(request);
    if (permissionError) return permissionError;

    const parsed = schemas.permission.delete.parse({ params });
    const result = await deletePermission(parsed.params.id);

    return createSuccessResponse("Permission deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

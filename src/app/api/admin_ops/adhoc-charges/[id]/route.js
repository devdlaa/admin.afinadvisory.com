
import { updateEntityCharge,
  deleteEntityCharge, } from "@/services/task/taskChargesOverride.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
  
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.entityAdhocCharge.update.parse({
      params: resolvedParams,
      body,
    });

    const result = await updateEntityCharge(
      parsed.params.id,
      parsed.body,
      session.user,
    );

    return createSuccessResponse("Ad-hoc charge updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}
export async function DELETE(request, { params }) {
  try {
    const [permissionError, session,adminuser] = await requirePermission(
      request,
    
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.entityAdhocCharge.delete.parse({
      params: resolvedParams,
    });

    const result = await deleteEntityCharge(parsed.params.id, adminuser);

    return createSuccessResponse("Ad-hoc charge deleted successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

import {
  getBillableModuleById,
  updateBillableModule,
  deleteBillableModule,
} from "@/services/modules/billableModule.service";

import { schemas, uuidSchema } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";


export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_modules.access"
    );
    if (permissionError) return permissionError;

    const module_id = uuidSchema.parse(params.id);

    const module = await getBillableModuleById(module_id);

    return createSuccessResponse(
      "Billable module retrieved successfully",
      module
    );
  } catch (error) {
    return handleApiError(error);
  }
}


export async function PATCH(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "billable_modules.manage"
    );
    if (permissionError) return permissionError;

    const module_id = uuidSchema.parse(params.id);

    const body = await request.json();
    const validated = schemas.billableModule.update.parse(body);

    const updated = await updateBillableModule(
      module_id,
      validated,
      session.user.id
    );

    return createSuccessResponse(
      "Billable module updated successfully",
      updated
    );
  } catch (error) {
    return handleApiError(error);
  }
}


export async function DELETE(request, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "billable_modules.manage"
    );
    if (permissionError) return permissionError;

    const module_id = uuidSchema.parse(params.id);

    await deleteBillableModule(module_id, session.user.id);

    return createSuccessResponse("Billable module deleted successfully", {
      id: module_id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

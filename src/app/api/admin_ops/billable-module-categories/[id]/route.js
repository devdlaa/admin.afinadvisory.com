import { schemas, uuidSchema } from "@/schemas";

import {
  getBillableModuleCategoryById,
  updateBillableModuleCategory,
  deleteBillableModuleCategory,
} from "@/services/modules/billableModuleCategory.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_module_categories.access"
    );
    if (permissionError) return permissionError;

    const category_id = uuidSchema.parse(params.id);

    const category = await getBillableModuleCategoryById(category_id);

    return createSuccessResponse(
      "Billable module category retrieved successfully",
      category
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_module_categories.manage"
    );
    if (permissionError) return permissionError;

    const category_id = uuidSchema.parse(params.id);

    const body = await request.json();
    const validated = schemas.billableModule.category.update.parse(body);

    const category = await updateBillableModuleCategory(category_id, validated);

    return createSuccessResponse(
      "Billable module category updated successfully",
      category
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_module_categories.manage"
    );
    if (permissionError) return permissionError;

    const category_id = uuidSchema.parse(params.id);

    const result = await deleteBillableModuleCategory(category_id);

    return createSuccessResponse(
      "Billable module category deleted successfully",
      { id: category_id, ...result }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

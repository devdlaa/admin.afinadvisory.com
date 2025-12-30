import {
  createBillableModuleCategory,
  listBillableModuleCategories,
} from "@/services/modules/billableModuleCategory.service";

import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_module_categories.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const validated = schemas.billableModule.category.create.parse(body);

    const category = await createBillableModuleCategory({
      validated,
    });

    return createSuccessResponse(
      "Billable module category created successfully",
      category,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_module_categories.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const validated = schemas.billableModule.category.list.parse({
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const result = await listBillableModuleCategories(validated);

    return createSuccessResponse(
      "Billable module categories retrieved successfully",
      result
    );
  } catch (error) {
    return handleApiError(error);
  }
}

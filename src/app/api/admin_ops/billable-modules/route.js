import {
  createBillableModule,
  listBillableModules,
} from "@/services/modules/billableModule.service";
import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// POST → create billable module
export async function POST(request) {
  try {
    const [permissionError, session] = await requirePermission(
      request,
      "billable_modules.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    // central schema validation
    const validated = schemas.billableModule.create.parse(body);

    const module = await createBillableModule(validated, session.user.id);

    return createSuccessResponse(
      "Billable module created successfully",
      module,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// GET → list billable modules
export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(
      request,
      "billable_modules.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);

    const validated = schemas.billableModule.query.parse({
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
      category_id: searchParams.get("category_id") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const result = await listBillableModules(validated);

    return createSuccessResponse(
      "Billable modules retrieved successfully",
      result
    );
  } catch (error) {
    return handleApiError(error);
  }
}

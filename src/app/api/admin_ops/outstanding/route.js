import { schemas } from "@/schemas";

import { listOutstandingEntities } from "@/services/task/reconcile.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.outstanding.query.parse({
      entity_ids: searchParams.getAll("entity_ids"),
      charge_type: searchParams.get("charge_type") ?? undefined,

      sort_by: searchParams.get("sort_by") ?? undefined,
      sort_order: searchParams.get("sort_order") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const result = await listOutstandingEntities(filters);

    return createSuccessResponse(
      "Outstanding entities retrieved successfully",
      result,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

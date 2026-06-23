import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { schemas } from "@/schemas";

import { createPermissions,listPermissions } from "@/services/admin/permission.service";

export async function POST(request) {
  try {
    const [permissionError] = await requirePermission(request);
    if (permissionError) return permissionError;

    const body = await request.json();
    const parsed = schemas.permission.create.parse({ body });

    const result = await createPermissions(parsed.body.permissions);

    return createSuccessResponse("Permissions created successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request) {
  try {
    const [permissionError] = await requirePermission(request);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const parsed = schemas.permission.list.parse({
      query: Object.fromEntries(searchParams),
    });

    const result = await listPermissions(parsed.query);

    return createSuccessResponse("Permissions fetched successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

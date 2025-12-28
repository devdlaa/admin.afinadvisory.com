import { listPermissions } from "@/services_backup/admin/permission.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

export async function GET() {
  try {
    const permissions = await listPermissions();
    return createSuccessResponse("Permissions fetched", permissions);
  } catch (e) {
    return handleApiError(e);
  }
}

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { listAllPermissions as listPermissions } from "@/services/admin/permission.service";
export async function GET() {
  try {
    const permissions = await listPermissions();
    return createSuccessResponse("Permissions fetched", permissions);
  } catch (e) {
    return handleApiError(e);
  }
}

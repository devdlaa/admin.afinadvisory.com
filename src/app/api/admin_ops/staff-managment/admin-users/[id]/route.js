import { schemas } from "@/schemas";
import {
  getAdminUserById,
  updateAdminUser,
  deleteAdminUser,
} from "@/services_backup/admin/admin-user.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

export async function GET(req, { params }) {
  try {
    const user = await getAdminUserById(params.id);
    return createSuccessResponse("Admin user retrieved successfully", user);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req, { params }) {
  try {
    // TODO : AUTH VALIDATION & PERMISSION CHECK
    // const session = await auth();
    // if (!session?.user) {
    //   return createErrorResponse(
    //     "Unauthorized - Please login to continue",
    //     401,
    //     "AUTH_REQUIRED"
    //   );
    // }

    // // Permission check - uncomment and configure based on your permission mapping
    // const permissionCheck = await requirePermission(request, "business.manage");
    // if (permissionCheck) return permissionCheck;

    const session = {
      username: "admin",
      user_id: 1221,
    };

    const body = schemas.adminUser.update.parse(await req.json());

    const user = await updateAdminUser(params.id, body, session.user_id);

    return createSuccessResponse("Admin user updated successfully", user);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    // TODO : AUTH VALIDATION & PERMISSION CHECK
    // const session = await auth();
    // if (!session?.user) {
    //   return createErrorResponse(
    //     "Unauthorized - Please login to continue",
    //     401,
    //     "AUTH_REQUIRED"
    //   );
    // }

    // // Permission check - uncomment and configure based on your permission mapping
    // const permissionCheck = await requirePermission(request, "business.manage");
    // if (permissionCheck) return permissionCheck;

    const session = {
      username: "admin",
      user_id: 1221,
    };

    const user = await deleteAdminUser(params.id, session.user_id);

    return createSuccessResponse("Admin user deleted successfully", user);
  } catch (e) {
    return handleApiError(e);
  }
}

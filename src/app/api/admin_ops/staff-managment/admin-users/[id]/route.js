import { schemas, uuidSchema } from "@/schemas";

import {
  getAdminUserById,
  updateAdminUser,
  deleteAdminUser,
} from "@/services/admin/admin-user.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

// GET /api/admin-users/:id
export async function GET(req, { params }) {
  try {
    const admin_user_id = uuidSchema.parse(params.id);

    const [permissionError] = await requirePermission(
      req,
      "admin_users.access"
    );
    if (permissionError) return permissionError;

    const user = await getAdminUserById(admin_user_id);

    return createSuccessResponse("Admin user retrieved successfully", user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req, { params }) {
  try {
    const admin_user_id = uuidSchema.parse(params.id);

    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const body = schemas.adminUser.update.parse(await req.json());

    const updated = await updateAdminUser(admin_user_id, body, session.user.id);

    return createSuccessResponse("Admin user updated successfully", updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    const admin_user_id = uuidSchema.parse(params.id);

    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const deleted = await deleteAdminUser(admin_user_id, session.user.id);

    return createSuccessResponse("Admin user deleted successfully", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

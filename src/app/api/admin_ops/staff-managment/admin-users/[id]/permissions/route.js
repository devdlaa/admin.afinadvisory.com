import { uuidSchema } from "@/schemas";

import {
  listUserPermissions,
  syncUserPermissionsByCode,
} from "@/services/admin/permission.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req, { params }) {
  try {
    const admin_user_id = uuidSchema.parse(params.id);

    const [permissionError] = await requirePermission(
      req,
      "admin_users.access"
    );
    if (permissionError) return permissionError;

    const permissions = await listUserPermissions(admin_user_id);

    return createSuccessResponse(
      "User permissions retrieved successfully",
      permissions
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req, { params }) {
  try {
    const p = await params;
    const admin_user_id = uuidSchema.parse(p.id);

    const [permissionError, session] = await requirePermission(
      req,
      "admin_users.manage"
    );
    if (permissionError) return permissionError;

    const body = await req.json();

    const permissionCodes = body.permissionCodes;

    if (!Array.isArray(permissionCodes)) {
      throw new ValidationError("permissionCodes must be an array");
    }

    const updatedPermissions = await syncUserPermissionsByCode(
      admin_user_id,
      permissionCodes
    );

    return createSuccessResponse(
      "User permissions updated successfully",
      updatedPermissions
    );
  } catch (error) {
 
    return handleApiError(error);
  }
}

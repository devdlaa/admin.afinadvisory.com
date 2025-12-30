import { schemas, uuidSchema } from "@/schemas";

import {
  updateDepartment,
  deleteDepartment,
} from "@/services/admin/department.service";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

//
// PUT → update name
//
export async function PUT(req, { params }) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "departments.manage"
    );
    if (permissionError) return permissionError;

    const department_id = uuidSchema.parse(params.id);
    const body = await req.json();

    const validated = schemas.department.update.parse(body);

    const data = await updateDepartment(department_id, validated);

    return createSuccessResponse("Department updated successfully", data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req, { params }) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "departments.manage"
    );
    if (permissionError) return permissionError;

    const department_id = uuidSchema.parse(params.id);

    await deleteDepartment(department_id);

    return createSuccessResponse("Department deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

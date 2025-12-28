// src/app/api/departments/[id]/route.js
import { schemas } from "@/schemas";
import {
  updateDepartment,
  deleteDepartment,
} from "@/services_backup/admin/department.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

export async function PUT(req, { params }) {
  try {
    const body = schemas.department.update.parse(await req.json());
    const dept = await updateDepartment(params.id, body.name);
    return createSuccessResponse("Department updated", dept);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_, { params }) {
  try {
    await deleteDepartment(params.id);
    return createSuccessResponse("Department deleted");
  } catch (e) {
    return handleApiError(e);
  }
}

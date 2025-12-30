import { schemas } from "@/schemas";

import {
  createDepartment,
  listDepartments,
} from "@/services/admin/department.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "departments.access"
    );
    if (permissionError) return permissionError;

    const data = await listDepartments();

    return createSuccessResponse("Departments fetched successfully", data);
  } catch (error) {
    return handleApiError(error);
  }
}

//
// POST → create department
//
export async function POST(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "departments.manage"
    );
    if (permissionError) return permissionError;
    const body = await req.json();
    const validated = schemas.department.create.parse(body);

    const dept = await createDepartment(validated);

    return createSuccessResponse("Department created successfully", dept, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

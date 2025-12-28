// src/app/api/departments/route.js
import { schemas } from "@/schemas";
import {
  createDepartment,
  listDepartments,
} from "@/services_backup/admin/department.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

export async function GET() {
  try {
    const data = await listDepartments();
    return createSuccessResponse("Departments fetched", data);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req) {
  try {
    const body = schemas.department.create.parse(await req.json());
    const dept = await createDepartment(body.name);
    return createSuccessResponse("Department created", dept);
  } catch (e) {
    return handleApiError(e);
  }
}

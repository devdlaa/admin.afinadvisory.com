import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";
import {
  getCompanyProfileById,
  updateCompanyProfile,
  deleteCompanyProfile,
} from "@/services/shared/companyprofile.service";
export async function GET_BY_ID(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "companyprofile.view",
    );
    if (permissionError) return permissionError;

    const { id } = params;

    const profile = await getCompanyProfileById(id);

    return createSuccessResponse(
      "Company profile retrieved successfully",
      profile,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req, { params }) {
  try {
   const [permissionError, session, admin_user] = await requirePermission(
      req,
      "companyprofile.manage",
    );
    if (permissionError) return permissionError;

    const { id } = params;

    const body = schemas.companyProfile.update.parse(await req.json());

    const profile = await updateCompanyProfile(id, body, admin_user.id);

    return createSuccessResponse(
      "Company profile updated successfully",
      profile,
    );
  } catch (e) {
    console.log(e);
    return handleApiError(e);
  }
}

/**
 * DELETE /api/company-profiles/[id]
 * Delete a company profile
 */
export async function DELETE(req, { params }) {
  try {
   const [permissionError, session, admin_user] = await requirePermission(
      req,
      "companyprofile.manage",
    );
    if (permissionError) return permissionError;

    const { id } = params;

    const result = await deleteCompanyProfile(id);

    return createSuccessResponse(
      "Company profile deleted successfully",
      result,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

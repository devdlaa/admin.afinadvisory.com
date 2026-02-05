import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";
import { setDefaultCompanyProfile } from "@/services/shared/companyprofile.service";
export async function POST_SET_DEFAULT(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "companyprofile.manage",
    );
    if (permissionError) return permissionError;

    const { id } = params;

    const profile = await setDefaultCompanyProfile(id, admin_user.id);

    return createSuccessResponse(
      "Default company profile set successfully",
      profile,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import { generateMeetingLink } from "@/services/leadsManager/leadsActivity.service";

export async function POST(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.leadActivity.id.parse({
      params: resolvedParams,
    });

    const result = await generateMeetingLink(parsed.params.id, admin_user);

    return createSuccessResponse(
      "Video call link generated successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

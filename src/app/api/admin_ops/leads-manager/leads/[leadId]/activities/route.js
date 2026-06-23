import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import {
  createLeadActivity,
  listLeadActivities,
} from "@/services/leadsManager/leadsActivity.service";

export async function POST(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.leadActivity.create.parse({ ...body });

    const result = await createLeadActivity(
      resolvedParams?.leadId,
      parsed,
      admin_user,
    );

    return createSuccessResponse("Activity created successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const resolvedParams = await params;

    const parsed = schemas.leadActivity.list.parse({
      query: Object.fromEntries(searchParams),
    });

  

    const result = await listLeadActivities(
      resolvedParams.leadId,
      parsed,
      admin_user,
    );

    return createSuccessResponse("Activities fetched successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

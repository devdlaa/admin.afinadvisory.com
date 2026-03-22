import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { syncLeadAssignments } from "@/services/leadsManager/leadAssignment.service";

export async function POST(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "lead.manage",
    );

    if (permissionError) return permissionError;

    const { id } = await params;

    const body = schemas.leadAssignment.sync.parse({
      lead_id: id,
      ...(await req.json()),
    });

    const result = await syncLeadAssignments(
      body.lead_id,
      body.users,
      admin_user,
    );

    return createSuccessResponse(
      "Lead assignments updated successfully",
      result,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

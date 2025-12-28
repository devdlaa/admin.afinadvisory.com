import { enableComplianceRule } from "@/services/complianceRule.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * PATCH /api/compliance-rules/:id/enable
 * Enable compliance rule
 *
 * Validations:
 * - Rule must exist and be disabled
 */
export async function PATCH(req, { params }) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const rule = await enableComplianceRule(params.id, session.user_id);

    return createSuccessResponse("Compliance rule enabled successfully", rule);
  } catch (e) {
    return handleApiError(e);
  }
}

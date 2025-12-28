import { disableComplianceRule } from "@/services_backup/entity/compliance-rule.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * PATCH /api/compliance-rules/:id/disable
 * Disable compliance rule
 * 
 * Validations:
 * - Rule must exist and be active
 * - No active task templates must be using this rule
 */
export async function PATCH(req, { params }) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const rule = await disableComplianceRule(params.id, session.user_id);

    return createSuccessResponse(
      "Compliance rule disabled successfully",
      rule
    );
  } catch (e) {
    return handleApiError(e);
  }
}
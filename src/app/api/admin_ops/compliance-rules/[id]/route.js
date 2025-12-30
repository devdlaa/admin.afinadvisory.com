import { schemas, uuidSchema } from "@/schemas";

import {
  getComplianceRuleById,
  updateComplianceRule,
} from "@/services/entity/compliance-rule.service";

import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req, { params }) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "compliance_rules.access"
    );
    if (permissionError) return permissionError;

    const rule_id = uuidSchema.parse(params.id);

    const rule = await getComplianceRuleById(rule_id);

    return createSuccessResponse(
      "Compliance rule retrieved successfully",
      rule
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req, { params }) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "compliance_rules.manage"
    );
    if (permissionError) return permissionError;

    const rule_id = uuidSchema.parse(params.id);

    const body = await req.json();
    const validated = schemas.complianceRule.update.parse(body);

    const updated = await updateComplianceRule(
      rule_id,
      validated,
      session.user.id
    );

    return createSuccessResponse(
      "Compliance rule updated successfully",
      updated
    );
  } catch (error) {
    return handleApiError(error);
  }
}

//
// DELETE → politely forbidden (disabled instead)
//
export async function DELETE() {
  return createErrorResponse(
    "Deletion not allowed. Disable the rule instead.",
    405,
    "METHOD_NOT_ALLOWED"
  );
}

import { schemas } from "@/schemas";

import {
  createComplianceRule,
  listComplianceRules,
} from "@/services/entity/compliance-rule.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError, session] = await requirePermission(
      req,
      "compliance_rules.create"
    );
    if (permissionError) return permissionError;

    const body = await req.json();
    const validated = schemas.complianceRule.create.parse(body);

    const rule = await createComplianceRule(validated, session.user.id);

    return createSuccessResponse(
      "Compliance rule created successfully",
      rule,
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(
      req,
      "compliance_rules.access"
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.complianceRule.list.parse({
      registration_type_id:
        searchParams.get("registration_type_id") ?? undefined,
      frequency_type: searchParams.get("frequency_type") ?? undefined,
      is_active: searchParams.get("is_active") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const rules = await listComplianceRules(filters);

    return createSuccessResponse(
      "Compliance rules retrieved successfully",
      rules
    );
  } catch (error) {
    return handleApiError(error);
  }
}

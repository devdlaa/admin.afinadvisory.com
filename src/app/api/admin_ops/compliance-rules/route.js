import { schemas } from "@/schemas";
import {
  createComplianceRule,
  listComplianceRules,
} from "@/services/complianceRule.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * POST /api/compliance-rules
 * Create new compliance rule
 * 
 * Body:
 * {
 *   "compliance_code": "GST_GSTR3B_QUARTERLY",
 *   "name": "GSTR-3B Quarterly Filing",
 *   "registration_type_id": "uuid",
 *   "frequency_type": "QUARTERLY",
 *   "due_day": 20,
 *   "due_month_offset": 1,
 *   "grace_days": 3,
 *   "is_active": true
 * }
 * 
 * Note: anchor_months and period_label_type are auto-calculated
 */
export async function POST(req) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = await req.json();
    const validatedData = schemas.complianceRule.create.parse(body);
    
    const rule = await createComplianceRule(validatedData, session.user_id);

    return createSuccessResponse(
      "Compliance rule created successfully",
      rule,
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * GET /api/compliance-rules
 * List all compliance rules with optional filters
 * 
 * Query params:
 * - registration_type_id (optional): Filter by registration type
 * - frequency_type (optional): MONTHLY | QUARTERLY | HALFYEARLY | YEARLY
 * - is_active (optional): true | false
 * - search (optional): Search in name and compliance_code
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = {
      registration_type_id: searchParams.get("registration_type_id") || undefined,
      frequency_type: searchParams.get("frequency_type") || undefined,
      is_active:
        searchParams.get("is_active") === "true"
          ? true
          : searchParams.get("is_active") === "false"
          ? false
          : undefined,
      search: searchParams.get("search") || undefined,
    };

    const rules = await listComplianceRules(filters);

    return createSuccessResponse(
      "Compliance rules retrieved successfully",
      {
        rules,
        total: rules.length,
      }
    );
  } catch (e) {
    return handleApiError(e);
  }
}


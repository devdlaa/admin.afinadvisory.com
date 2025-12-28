import { schemas } from "@/schemas";

import {   getComplianceRuleById,
  updateComplianceRule, } from "@/services_backup/entity/compliance-rule.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

/**
 * GET /api/compliance-rules/:id
 * Get compliance rule by ID with full details
 */
export async function GET(req, { params }) {
  try {
    const rule = await getComplianceRuleById(params.id);
    return createSuccessResponse(
      "Compliance rule retrieved successfully",
      rule
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PUT /api/compliance-rules/:id
 * Update compliance rule (partial update allowed)
 * 
 * Body (all optional except those being updated):
 * {
 *   "name": "Updated name",
 *   "registration_type_id": "new-uuid",
 *   "frequency_type": "MONTHLY",
 *   "due_day": 15,
 *   "due_month_offset": 0,
 *   "grace_days": 5,
 *   "is_active": false
 * }
 * 
 * Note: 
 * - compliance_code CANNOT be updated
 * - If frequency_type changes, anchor_months and period_label_type auto-update
 */
export async function PUT(req, { params }) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = await req.json();
    const validatedData = schemas.complianceRule.update.parse(body);
    
    const rule = await updateComplianceRule(
      params.id,
      validatedData,
      session.user_id
    );

    return createSuccessResponse(
      "Compliance rule updated successfully",
      rule
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/compliance-rules/:id
 * Delete compliance rule (if you want hard delete)
 * Currently not implemented - use disable instead
 */
export async function DELETE(req, { params }) {
  try {
    return createSuccessResponse(
      "Delete not allowed. Use disable endpoint instead.",
      null,
      405
    );
  } catch (e) {
    return handleApiError(e);
  }
}
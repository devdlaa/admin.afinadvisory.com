import { schemas } from "@/schemas";

import {
  addMemberToGroup,
  listGroupMembers,
} from "@/services/entity/entity-group-member.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * POST /api/entity-groups/:id/members
 * Add member to group
 */
export async function POST(req, { params }) {
  try {
    const body = await req.json();

    const validated = schemas.entityGroup.addMember.parse({
      entity_group_id: params.id,
      entity_id: body.entity_id,
      role: body.role,
    });

    const member = await addMemberToGroup(validated);

    return createSuccessResponse("Member added successfully", member, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * GET /api/entity-groups/:id/members
 * List group members
 */
export async function GET(req, { params }) {
  try {
    const { searchParams } = new URL(req.url);

    const filters = schemas.entityGroup.listMembers.parse({
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const members = await listGroupMembers(params.id, filters);

    return createSuccessResponse(
      "Group members retrieved successfully",
      members
    );
  } catch (e) {
    return handleApiError(e);
  }
}

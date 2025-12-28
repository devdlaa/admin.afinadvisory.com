import { schemas } from "@/schemas";
import { bulkAddMembers } from "@/services_backup/entity/entity-group-member.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

/**
 * POST /api/entity-groups/:id/members/bulk
 * Bulk add members to group
 */
export async function POST(req, { params }) {
  try {
    const body = await req.json();

    const validated = z
      .object({
        members: z
          .array(
            z.object({
              entity_id: z.string().uuid(),
              role: schemas.entityGroup.enums.role,
            })
          )
          .min(1),
      })
      .parse(body);

    const result = await bulkAddMembers(params.id, validated.members);

    return createSuccessResponse(
      `${result.count} members added successfully`,
      result,
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}

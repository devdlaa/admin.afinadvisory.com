import { z } from "zod";
import { toggleRetainerStatus } from "@/services_backup/entity/entity.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";
// import { auth } from "@/utils/auth";

const ToggleRetainerSchema = z.object({
  is_retainer: z.boolean(),
});

/**
 * PATCH /api/entities/:id/toggle-retainer
 * Toggle retainer status
 */
export async function PATCH(req, { params }) {
  try {
    // TODO: AUTH VALIDATION & PERMISSION CHECK
    const session = { user_id: "admin-user-id" };

    const body = ToggleRetainerSchema.parse(await req.json());
    const entity = await toggleRetainerStatus(
      params.id,
      body.is_retainer,
      session.user_id
    );

    return createSuccessResponse(
      "Retainer status updated successfully",
      entity
    );
  } catch (e) {
    return handleApiError(e);
  }
}

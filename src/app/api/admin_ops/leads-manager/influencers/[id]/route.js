import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import {
  getInfluencerById,
  updateInfluencer,
  deleteInfluencer,
} from "@/services/leadsManager/influencer.service";


/**
 * GET /api/influencers/:id
 */
export async function GET(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "influencer.access",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.influencer.id.parse(await params);

    const influencer = await getInfluencerById(id, admin_user.id);

    return createSuccessResponse(
      "Influencer retrieved successfully",
      influencer,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "influencer.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.influencer.id.parse(await params);

    const body = schemas.influencer.update.parse(await req.json());

    const influencer = await updateInfluencer(id, body, admin_user.id);

    return createSuccessResponse("Influencer updated successfully", influencer);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "influencer.manage",
    );
    if (permissionError) return permissionError;

    const { id } = schemas.influencer.id.parse(await params);

    await deleteInfluencer(id, admin_user.id);

    return createSuccessResponse("Influencer deleted successfully", null);
  } catch (e) {
    return handleApiError(e);
  }
}

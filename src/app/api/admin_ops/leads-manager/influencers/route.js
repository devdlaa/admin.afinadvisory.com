import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import {
  createInfluencer,
  listInfluencers,
} from "@/services/leads/influencer.service";

export async function GET(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "influencer.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.influencer.list.parse({
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const influencers = await listInfluencers(filters, admin_user.id);

    return createSuccessResponse(
      "Influencers retrieved successfully",
      influencers,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "influencer.manage",
    );
    if (permissionError) return permissionError;

    const body = schemas.influencer.create.parse(await req.json());

    const influencer = await createInfluencer(body, admin_user.id);

    return createSuccessResponse(
      "Influencer created successfully",
      influencer,
      201,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

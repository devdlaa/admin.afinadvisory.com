import { schemas } from "@/schemas";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import {
  createLeadTag,
  listLeadTags,
} from "@/services/leadsManager/leadTags.service";

export async function GET(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.leadTag.list.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const tags = await listLeadTags(filters, admin_user);

    return createSuccessResponse("Lead tags retrieved successfully", tags);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const body = schemas.leadTag.create.parse(await req.json());

    const tag = await createLeadTag(body, admin_user);

    return createSuccessResponse("Lead tag created successfully", tag, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

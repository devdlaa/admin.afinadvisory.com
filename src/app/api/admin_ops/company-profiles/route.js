import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import {   createCompanyProfile,
  listCompanyProfiles, } from "@/services/shared/companyprofile.service";

/**
 * GET /api/company-profiles
 * List all company profiles with optional filters
 */
export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    // Use centralized query schema
    const filters = schemas.companyProfile.query.parse({
      is_default: searchParams.get("is_default") ?? undefined,
      is_active: searchParams.get("is_active") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
    });

    const profiles = await listCompanyProfiles(filters);

    return createSuccessResponse(
      "Company profiles retrieved successfully",
      profiles,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/company-profiles
 * Create a new company profile
 */
export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;

    const body = schemas.companyProfile.create.parse(await req.json());

    const profile = await createCompanyProfile(body, admin_user.id);

    return createSuccessResponse(
      "Company profile created successfully",
      profile,
      201,
    );
  } catch (e) {
    console.log(e);
    return handleApiError(e);
  }
}

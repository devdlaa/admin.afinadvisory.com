import { schemas } from "@/schemas";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";



import { createLeadContact,listLeadContacts } from "@/services/leadsManager/leadContacts.service";

export async function GET(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadcontact.view",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.leadContact.list.parse({
      page: searchParams.get("page") ?? undefined,
      page_size: searchParams.get("page_size") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      compact: searchParams.get("compact") ?? undefined,
      entity_type: searchParams.get("entity_type") ?? undefined,
      industry: searchParams.get("industry") ?? undefined,
      country_code: searchParams.get("country_code") ?? undefined,
      state_code: searchParams.get("state_code") ?? undefined,
      preferred_language: searchParams.get("preferred_language") ?? undefined,
      has_email: searchParams.get("has_email") ?? undefined,
      has_phone: searchParams.get("has_phone") ?? undefined,
    });

    const contacts = await listLeadContacts(filters, admin_user.id);

    return createSuccessResponse(
      "Lead contacts retrieved successfully",
      contacts,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      req,
      "leadcontact.manage",
    );
    if (permissionError) return permissionError;

    const body = schemas.leadContact.create.parse(await req.json());

    const contact = await createLeadContact(body, admin_user.id);

    return createSuccessResponse(
      "Lead contact created successfully",
      contact,
      201,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

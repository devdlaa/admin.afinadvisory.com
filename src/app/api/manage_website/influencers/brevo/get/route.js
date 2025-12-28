import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import { requirePermission } from "@/utils/server/requirePermission";
export async function GET(request) {
  // Permission check
  const permissionCheck = await requirePermission(request, "influencers.access");
  if (permissionCheck) return permissionCheck;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoListId = process.env.BREVO_JOIN_PARRNTER_LIST_ID;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 10;

  try {
    const offset = (page - 1) * limit;
    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${brevoListId}/contacts?limit=${limit}&offset=${offset}`,
      {
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
        },
      }
    );
    const data = await response.json();

    if (!response.ok) {
      return createErrorResponse("Failed to fetch contacts", response.status);
    }

    return createSuccessResponse("Contacts fetched successfully", {
      page,
      limit,
      contacts: data?.contacts || [],
      total: data?.count || 0,
    });
  } catch (error) {
    return createErrorResponse("Internal server error", 500, "SERVER_ERROR", {
      error: error.message,
    });
  }
}

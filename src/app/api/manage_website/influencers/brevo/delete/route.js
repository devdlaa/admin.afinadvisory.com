

import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request) {
  // Permission check
  const permissionCheck = await requirePermission(request, "influencers.access");
  if (permissionCheck) return permissionCheck;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoListId = process.env.BREVO_JOIN_PARRNTER_LIST_ID;

  if (!brevoApiKey || !brevoListId) {
    return createErrorResponse("Brevo configuration missing", 500, "CONFIG_ERROR");
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return createErrorResponse("Email is required", 400, "INVALID_INPUT");
    }

    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${brevoListId}/contacts/remove`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({ emails: [email] }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return createErrorResponse(
        "Failed to remove contact",
        response.status,
        "REMOVE_FAILED",
        data
      );
    }

    return createSuccessResponse("Contact removed successfully", { email });
  } catch (error) {
    return createErrorResponse("Internal server error", 500, "SERVER_ERROR", {
      error: error.message,
    });
  }
}

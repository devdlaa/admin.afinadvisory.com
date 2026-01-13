import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request) {
  const [permissionError] = await requirePermission(req, "influencers.access");
  if (permissionError) return permissionError;

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoListId = Number(process.env.BREVO_JOIN_PARRNTER_LIST_ID);

  if (!brevoApiKey || !brevoListId) {
    return createErrorResponse(
      "Missing Brevo credentials",
      500,
      "MISSING_BREVO_CONFIG"
    );
  }

  try {
    const { email, hasAccountAlready } = await request.json();

    if (!email) {
      return createErrorResponse("Email is required", 400, "INVALID_INPUT");
    }

    if (typeof hasAccountAlready !== "boolean") {
      return createErrorResponse(
        "Invalid value for hasAccountAlready (must be boolean)",
        400,
        "INVALID_INPUT"
      );
    }

    const response = await fetch(
      `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
      {
        method: "PUT",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({
          attributes: {
            HASACCOUNTALREADY: hasAccountAlready,
          },
          listIds: [brevoListId],
          updateEnabled: true,
        }),
      }
    );

    // 🩹 Fix: safely handle empty body
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = {}; // Brevo might return empty 204
    }

    if (!response.ok) {
      return createErrorResponse(
        "Failed to update Brevo contact",
        response.status,
        "BREVO_UPDATE_FAILED",
        data
      );
    }

    return createSuccessResponse("Contact updated successfully", {
      email,
      hasAccountAlready,
      listId: brevoListId,
      brevoResponse: data,
    });
  } catch (error) {
    return createErrorResponse("Internal server error", 500, "SERVER_ERROR", {
      error: error.message,
    });
  }
}

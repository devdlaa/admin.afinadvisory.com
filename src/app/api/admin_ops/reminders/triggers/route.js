import { getTodayTriggers } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const result = await getTodayTriggers(currentUser);

    return createSuccessResponse(
      "Today triggers retrieved successfully",
      result,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

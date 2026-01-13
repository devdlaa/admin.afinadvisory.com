import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { markAllAsRead } from "@/services/shared/notifications.service";

export async function POST(request) {
  try {
    const [permissionError, session] = await requirePermission(request);
    if (permissionError) return permissionError;

    const updated = await markAllAsRead(session.user.id);

    if (updated === 0) {
      return createSuccessResponse("No unread notifications");
    }

    return createSuccessResponse("All notifications marked as read", {
      updated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

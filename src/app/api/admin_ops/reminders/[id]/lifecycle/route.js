import { schemas } from "@/schemas";

import { updateReminderLifecycle } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function PUT(req, { params }) {
  try {
    const [permissionError, , admin_user] = await requirePermission(
      req,
      "reminders.manage",
    );
    if (permissionError) return permissionError;
    const { id } = await params;

    const body = schemas.reminder.lifecycle.parse(await req.json());

    const result = await updateReminderLifecycle(id, body, admin_user);

    const message =
      body.action === "ACKNOWLEDGE"
        ? "Reminder acknowledged successfully"
        : "Reminder snoozed successfully";

    return createSuccessResponse(message, result);
  } catch (e) {
    return handleApiError(e);
  }
}

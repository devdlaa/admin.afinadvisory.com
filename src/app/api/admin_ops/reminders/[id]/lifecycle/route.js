import { schemas } from "@/schemas";

import { updateReminderLifecycle } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { uuidSchema } from "@/schemas";

export async function PUT(req, { params }) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const reminderId = uuidSchema.parse(params.id);
    const body = schemas.reminder.lifecycle.parse(await req.json());

    const result = await updateReminderLifecycle(reminderId, body, currentUser);

    const message =
      body.action === "ACKNOWLEDGE"
        ? "Reminder acknowledged successfully"
        : "Reminder snoozed successfully";

    return createSuccessResponse(message, result);
  } catch (e) {
    return handleApiError(e);
  }
}

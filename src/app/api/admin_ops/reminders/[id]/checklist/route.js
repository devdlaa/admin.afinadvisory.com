import { schemas } from "@/schemas";

import { syncReminderChecklist } from "@/services/reminders/reminder.checklist.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function PATCH(req, { params }) {
  try {
    const [permissionError, , admin_user] = await requirePermission(
      req,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const { id } = await params;

    const body = await req.json();

    const input = schemas.reminder.checklistSync.parse(body);

    const result = await syncReminderChecklist(id, input.items, admin_user);

    return createSuccessResponse("Checklist synced successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

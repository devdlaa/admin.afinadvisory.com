import { schemas } from "@/schemas";

import {
  getReminderDetail,
  updateReminder,
} from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { uuidSchema } from "@/schemas";

/* -----------------------------------------------------------------------
   GET /api/reminders/[id]  →  getReminderDetail
----------------------------------------------------------------------- */
export async function GET(req, { params }) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const reminderId = uuidSchema.parse(params.id);

    const result = await getReminderDetail(reminderId, currentUser);

    return createSuccessResponse("Reminder retrieved successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

/* -----------------------------------------------------------------------
   PUT /api/reminders/[id]  →  updateReminder
----------------------------------------------------------------------- */
export async function PUT(req, { params }) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const reminderId = uuidSchema.parse(params.id);
    const body = schemas.reminder.update.parse(await req.json());

    const result = await updateReminder(reminderId, body, currentUser);

    return createSuccessResponse("Reminder updated successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

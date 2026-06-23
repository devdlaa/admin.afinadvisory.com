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
    const [permissionError, , admin_user] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;
    const { id } = await params;

    const reminderId = uuidSchema.parse(id);

    const result = await getReminderDetail(reminderId, admin_user);

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
    const [permissionError, , admin_user] = await requirePermission(
      req,
      "reminders.manage",
    );
    if (permissionError) return permissionError;
    const { id } = await params;
    const reminderId = uuidSchema.parse(id);
    const body = schemas.reminder.update.parse(await req.json());

    const result = await updateReminder(reminderId, body, admin_user);

    return createSuccessResponse("Reminder updated successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

import {
  updateReminderBucket,
  deleteReminderBucket,
} from "@/services/reminders/reminder.meta.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;
    const body = await request.json();

    const parsed = schemas.reminderList.update.parse({
      params: { id: resolvedParams.listId },
      body,
    });

    const updated = await updateReminderBucket(
      parsed.params.id,
      parsed.body,
      admin_user,
    );

    return createSuccessResponse("List updated successfully", updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.reminderList.delete.parse({
      params: { id: resolvedParams.listId },
    });

    const deleted = await deleteReminderBucket(parsed.params.id, admin_user);

    return createSuccessResponse("List deleted successfully", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

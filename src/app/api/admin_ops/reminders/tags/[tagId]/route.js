import {
  updateReminderTag,
  deleteReminderTag,
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

    const parsed = schemas.reminderTag.update.parse({
      params: { id: resolvedParams.tagId },
      body,
    });

    const updated = await updateReminderTag(
      parsed.params.id,
      parsed.body,
      admin_user,
    );

    return createSuccessResponse("Tag updated successfully", updated);
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

    const parsed = schemas.reminderTag.delete.parse({
      params: { id: resolvedParams.tagId },
    });

    const deleted = await deleteReminderTag(parsed.params.id, admin_user);

    return createSuccessResponse("Tag deleted successfully", deleted);
  } catch (error) {
    return handleApiError(error);
  }
}

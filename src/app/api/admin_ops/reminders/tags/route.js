import {
  createReminderTag,
  listReminderTags,
} from "@/services/reminders/reminder.meta.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const tags = await listReminderTags(admin_user);

    return createSuccessResponse("Tags fetched successfully", tags);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const parsed = schemas.reminderTag.create.parse({
      body,
    });

    const tag = await createReminderTag(parsed.body, admin_user);

    return createSuccessResponse("Tag created successfully", tag);
  } catch (error) {
    return handleApiError(error);
  }
}

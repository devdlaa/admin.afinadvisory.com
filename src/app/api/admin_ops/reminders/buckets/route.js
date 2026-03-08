import {
  createReminderBucket,
  listReminderBuckets,
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

    const { searchParams } = new URL(request.url);

    const parsed = schemas.reminderList.query.parse({
      query: {
        all: searchParams.get("all"),
      },
    });

    const lists = await listReminderBuckets(admin_user, parsed.query);

    return createSuccessResponse("Lists fetched successfully", lists);
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

    const parsed = schemas.reminderList.create.parse({
      body,
    });

    const list = await createReminderBucket(parsed.body, admin_user);

    return createSuccessResponse("List created successfully", list);
  } catch (error) {
    return handleApiError(error);
  }
}

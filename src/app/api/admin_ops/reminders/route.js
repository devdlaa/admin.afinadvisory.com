import { schemas } from "@/schemas";

import { createReminder, getMyDay } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const rawTagIds = searchParams.get("tag_ids");

    const input = schemas.reminder.myDay.parse({
      bucket_id: searchParams.get("bucket_id") ?? undefined,
      tag_ids: rawTagIds ? rawTagIds.split(",") : undefined,
    });

    const result = await getMyDay(input, currentUser);

    return createSuccessResponse("My day retrieved successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

/* -----------------------------------------------------------------------
   POST /api/reminders  →  createReminder
   Returns { reminder, conflict } — caller must check conflict.exists
----------------------------------------------------------------------- */
export async function POST(req) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.manage",
    );
    if (permissionError) return permissionError;

    const body = schemas.reminder.create.parse(await req.json());

    const result = await createReminder(body, currentUser);

    // Conflict — 409 so caller can handle the suggested times
    if (result.conflict?.exists) {
      return createSuccessResponse("Reminder conflict detected", result, 409);
    }

    return createSuccessResponse("Reminder created successfully", result, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

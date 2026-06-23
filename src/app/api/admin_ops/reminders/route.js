import { schemas } from "@/schemas";

import { createReminder, getMyDay } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

function parseArray(value) {
  if (!value) return undefined;
  return value.split(",").filter(Boolean);
}

export async function GET(req) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const input = schemas.reminder.myDay.parse({
      bucket_id: searchParams.get("bucket_id"),
      tag_ids: parseArray(searchParams.get("tag_ids")),
      tab: searchParams.get("tab"),
      limit: searchParams.get("limit"),
      page: searchParams.get("page"),

      ignore_date_filter: searchParams.get("ignore_date_filter") === "true",
      is_overview: searchParams.get("is_overview") === "true",
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

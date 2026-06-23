import { schemas } from "@/schemas";

import { listReminderWeekBoards } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

function parseArray(value) {
  if (!value) return undefined;

  const arr = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return arr.length ? arr : undefined;
}

export async function GET(req) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const input = schemas.reminder.weekBoards.parse({
      bucket_id: searchParams.get("bucket_id") || undefined,
      tag_ids: parseArray(searchParams.get("tag_ids")),
      board_keys: parseArray(searchParams.get("board_keys")),
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
    });

    const result = await listReminderWeekBoards(input, currentUser);

    return createSuccessResponse("Week boards retrieved successfully", result);
  } catch (e) {
    return handleApiError(e);
  }
}

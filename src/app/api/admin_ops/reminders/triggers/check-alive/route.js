import { schemas } from "@/schemas";

import { checkAlive } from "@/services/reminders/reminders.core";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(req) {
  try {
    const [permissionError, , currentUser] = await requirePermission(
      req,
      "reminders.access",
    );
    if (permissionError) return permissionError;

    const { ids } = schemas.reminder.checkAlive.parse(await req.json());

    const result = await checkAlive(ids, currentUser);

    return createSuccessResponse("Alive check completed", result);
  } catch (e) {
    return handleApiError(e);
  }
}

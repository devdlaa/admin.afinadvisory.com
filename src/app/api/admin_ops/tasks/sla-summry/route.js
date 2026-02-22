import { getSLASummary } from "@/services/task/task.service";

import { requirePermission } from "@/utils/server/requirePermission";

import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

export async function GET(request) {
  try {
    const [permissionError, session, admin_user] =
      await requirePermission(request);

    if (permissionError) return permissionError;

    const SLA_SUMMARY = await getSLASummary(admin_user);

    return createSuccessResponse("SLA Summry", { SLA_SUMMARY });
  } catch (error) {
    return handleApiError(error);
  }
}

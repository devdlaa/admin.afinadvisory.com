import { z } from "zod";
import { getLeadStageTimeline } from "@/services/leadsManager/leadCore.service";
import { requirePermission } from "@/utils/server/requirePermission";
import {
  handleApiError,
  createSuccessResponse,
} from "@/utils/server/apiResponse";

/* ----------------------------------------
Zod Schema
---------------------------------------- */

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val > 0 && val <= 20, {
      message: "Limit must be between 1 and 20",
    }),
  cursor: z.string().optional(),
});

/* ----------------------------------------
GET Handler
---------------------------------------- */

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.access",
    );
    if (permissionError) return permissionError;

    const { lead_id } = params;

    /* ----------------------------------------
    Parse Query Params
    ---------------------------------------- */

    const url = new URL(request.url);
    const rawQuery = Object.fromEntries(url.searchParams.entries());

    const query = querySchema.parse(rawQuery);

    /* ----------------------------------------
    Call Service
    ---------------------------------------- */

    const result = await getLeadStageTimeline(lead_id, query, admin_user);

    return createSuccessResponse(
      "Stage history retrieved successfully",
      result,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

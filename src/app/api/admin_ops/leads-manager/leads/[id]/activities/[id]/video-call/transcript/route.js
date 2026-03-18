import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

import { fetchMeetingTranscript } from "@/services/leadsManager/leadsActivity.service";

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "leads.manage",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;

    const parsed = schemas.leadActivity.activityId.parse({
      params: resolvedParams,
    });

    const result = await fetchMeetingTranscript(parsed.params.id);

    /* Transcript already stored in S3 */

    if (result.from_cache) {
      return new Response(result.stream, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": 'inline; filename="transcript.txt"',
        },
      });
    }

    /* Transcript not ready from Zoom */

    if (!result.ready) {
      return createSuccessResponse("Transcript not ready yet", {
        ready: false,
      });
    }

    /* Transcript freshly fetched and uploaded */

    return createSuccessResponse("Transcript ready", {
      ready: true,
      url: result.url,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

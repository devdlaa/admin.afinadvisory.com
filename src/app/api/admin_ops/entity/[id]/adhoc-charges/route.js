import { createEntityCharge } from "@/services/task/taskChargesOverride.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function POST(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "reconcile.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.entityAdhocCharge.create.parse({
      params: {
        entity_id: resolvedParams?.id || null,
      },
      body,
    });

    const result = await createEntityCharge(
      parsed.params.entity_id,
      parsed.body,
      admin_user,
    );

    return createSuccessResponse("Ad-hoc charge created successfully", result);
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
}

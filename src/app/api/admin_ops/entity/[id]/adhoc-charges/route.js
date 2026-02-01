

import { createEntityCharge } from "@/services/task/taskChargesOverride.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function POST(request, { params }) {
  try {
    const [permissionError, session, adminuser] =
      await requirePermission(request);
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
      adminuser,
    );

    return createSuccessResponse("Ad-hoc charge created successfully", result);
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
}

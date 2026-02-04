
import { updateInvoiceStatus } from "@/services/task/invoicing.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function PATCH(request, { params }) {
  try {
    const [permissionError, session, adminUser] = await requirePermission(
      request,
   
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.invoice.updateStatus.parse({
      params: resolvedParams,
      body,
    });

    const result = await updateInvoiceStatus(
      parsed.params.id,
      parsed.body.status,
    );

    return createSuccessResponse("Invoice status updated", result);
  } catch (error) {
    return handleApiError(error);
  }
}

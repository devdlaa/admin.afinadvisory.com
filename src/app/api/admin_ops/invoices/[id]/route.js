
import {  getInvoiceDetails,
  updateInvoiceInfo, } from "@/services/task/invoicing.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function GET(request, { params }) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(
      request,
      "invoice.view",
    );
    if (permissionError) return permissionError;

    const resolvedParams = await params;
    const parsed = schemas.invoice.getDetails.parse({ params: resolvedParams });

    const result = await getInvoiceDetails(parsed.params.id);

    return createSuccessResponse("Invoice details retrieved", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
   const [permissionError, session, admin_user] = await requirePermission(
      request,
      "invoice.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const resolvedParams = await params;

    const parsed = schemas.invoice.updateInfo.parse({
      params: resolvedParams,
      body,
    });

    const result = await updateInvoiceInfo(parsed.params.id, parsed.body);

    return createSuccessResponse("Invoice updated successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

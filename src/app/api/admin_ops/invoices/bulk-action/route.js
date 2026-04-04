import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { schemas } from "@/schemas";

import { bulkInvoiceAction } from "@/services/task/invoicing.service";

export async function POST(request) {
  try {
  const [permissionError, session, admin_user] = await requirePermission(
      request,
      "invoice.manage",
    );
    if (permissionError) return permissionError;

    const body = await request.json();
    const parsed = schemas.invoice.bulkAction.parse({ body });

    const { invoice_ids, action } = parsed.body;

    const result = await bulkInvoiceAction(invoice_ids, action);

    return createSuccessResponse("Bulk invoice action processed", result);
  } catch (error) {
    return handleApiError(error);
  }
}

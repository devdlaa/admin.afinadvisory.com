import { bulkUpdateInvoiceStatus } from "@/services/invoice/invoice.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

// POST /api/invoices/bulk-status - Bulk update invoice status
export async function POST(request) {
  try {
    const [permissionError, session, adminUser] = await requirePermission(
      request,
      "invoices.manage"
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const parsed = schemas.invoice.bulkUpdateStatus.parse({ body });

    const result = await bulkUpdateInvoiceStatus({
      invoice_ids: parsed.body.invoice_ids,
      status: parsed.body.status,
      external_number_map: parsed.body.external_number_map,
    });

    return createSuccessResponse("Bulk status update completed", result);
  } catch (error) {
    return handleApiError(error);
  }
}

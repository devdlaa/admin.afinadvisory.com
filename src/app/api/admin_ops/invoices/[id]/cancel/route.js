import { cancelInvoice } from "@/services/task/invoicing.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

// POST /api/invoices/:id/cancel - Cancel invoice
export async function POST(request, { params }) {
  try {
    const [permissionError, session, adminUser] =
      await requirePermission(request);
    if (permissionError) return permissionError;

    const resolvedParams = await params;
    const parsed = schemas.invoice.cancel.parse({ params: resolvedParams });

    const result = await cancelInvoice(parsed.params.id);

    return createSuccessResponse("Invoice cancelled successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

import {
  createOrAppendInvoice,
  getInvoices,
} from "@/services/task/invoicing.service";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";
import { requirePermission } from "@/utils/server/requirePermission";
import { schemas } from "@/schemas";

export async function GET(request) {
  try {
    const [permissionError, session, adminUser] = await requirePermission(
      request,

    );
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams);

    const parsed = schemas.invoice.query.parse(filters);
    const result = await getInvoices(parsed);

    return createSuccessResponse("Invoices retrieved successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const [permissionError, session, adminUser] = await requirePermission(
      request,
   
    );
    if (permissionError) return permissionError;

    const body = await request.json();

    const parsed = schemas.invoice.createOrAppend.parse({ body });

    const result = await createOrAppendInvoice({
      ...parsed.body,
      currentUser: adminUser,
    });

    return createSuccessResponse("Invoice created successfully", result);
  } catch (error) {
    return handleApiError(error);
  }
}

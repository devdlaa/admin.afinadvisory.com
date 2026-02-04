import { schemas } from "@/schemas";

import {
  uploadDocumentService,
  listDocumentsService,
} from "@/services/shared/storage.service";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    const filters = schemas.document.query.parse({
      scope: searchParams.get("scope"),
      scope_id: searchParams.get("scope_id"),
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
      sort: searchParams.get("sort"),
      order: searchParams.get("order"),
    });

    const result = await listDocumentsService({
      scope: filters.scope,
      scopeId: filters.scope_id,
      page: filters.page,
      pageSize: filters.page_size,
      sort: filters.sort,
      order: filters.order,
    });

    return createSuccessResponse("Documents retrieved successfully", result);
  } catch (e) {
    console.log(e)
    return handleApiError(e);
  }
}

export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;

    const formData = await req.formData();
    const webFile = formData.get("file");

    if (!(webFile instanceof File)) {
      throw new Error("Invalid file upload");
    }

    // Convert Web File → Buffer
    const arrayBuffer = await webFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const file = {
      buffer,
      originalname: webFile.name,
      mimetype: webFile.type,
      size: webFile.size,
    };

    const body = schemas.document.upload.parse({
      scope: formData.get("scope"),
      scope_id: formData.get("scope_id"),
    });

    const document = await uploadDocumentService({
      file,
      scope: body.scope,
      scopeId: body.scope_id,
      currentUserId: admin_user.id,
    });

    return createSuccessResponse(
      "Document uploaded successfully",
      document,
      201,
    );
  } catch (e) {
    return handleApiError(e);
  }
}

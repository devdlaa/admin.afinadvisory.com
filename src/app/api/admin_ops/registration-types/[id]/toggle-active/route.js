import { toggleActiveStatus } from "@/services/entity/registration-type.service";
import { createSuccessResponse, handleApiError } from "@/utils/server/apiResponse";

export async function PATCH({ params }) {
  try {
    const regType = await toggleActiveStatus(params.id);

    return createSuccessResponse("Active status updated successfully", regType);
  } catch (e) {
    return handleApiError(e);
  }
}

import { requirePermission } from "@/utils/server/requirePermission";
import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import {
  uploadChatAttachment,
  validateChatFile,
} from "@/services/shared/minio-chat.service";

/**
 * Upload file for chat message
 * POST /api/chat/upload
 */
export async function POST(req) {
  try {
    const [permissionError, session, admin_user] = await requirePermission(req);
    if (permissionError) return permissionError;

    const formData = await req.formData();
    const webFile = formData.get("file");

    const chatId = formData.get("chat_id");

    if (!webFile || typeof webFile.arrayBuffer !== "function") {
      throw new Error("Invalid file upload");
    }

    if (!chatId) {
      throw new Error("Chat ID is required");
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

    // Validate file
    validateChatFile(file);

    // Upload to MinIO
    const attachment = await uploadChatAttachment({
      file,
      chatId,
    });

    return createSuccessResponse("File uploaded successfully", attachment, 201);
  } catch (error) {
    console.error("Chat file upload error:", error);
    return handleApiError(error);
  }
}

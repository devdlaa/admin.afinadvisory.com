import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/server/apiResponse";
import { prisma } from "@/utils/server/db";
import { requirePermission } from "@/utils/server/requirePermission";

export async function POST(request) {
  try {
    const [permissionError, session] = await requirePermission(request);
    if (permissionError) return permissionError;

    const { token, device } = await request.json();

    if (!token || typeof token !== "string") {
      return createErrorResponse("Valid token required", 400, "INVALID_TOKEN");
    }

    await prisma.userPushToken.upsert({
      where: { token },
      update: {
        user_id: session.user.id,
        device: device ?? null,
        updated_at: new Date(),
      },
      create: {
        token,
        user_id: session.user.id,
        device: device ?? null,
      },
    });

    return createSuccessResponse("Token registered");
  } catch (err) {
    return createErrorResponse(
      "Failed to register token",
      500,
      "PUSH_TOKEN_ERROR"
    );
  }
}

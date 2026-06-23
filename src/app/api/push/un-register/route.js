import { prisma } from "@/utils/server/db";

// DELETE - Unregister push token
export async function DELETE(request) {
  try {
    const [permissionError, session] = await requirePermission(request);
    if (permissionError) return permissionError;

    const { token } = await request.json();

    if (!token) {
      return createErrorResponse("Token required", 400, "TOKEN_REQUIRED");
    }


    await prisma.userPushToken.deleteMany({
      where: {
        token,
        user_id: session.user.id,
      },
    });

    return createSuccessResponse("Token unregistered");
  } catch (err) {
    return handleApiError(err);
  }
}

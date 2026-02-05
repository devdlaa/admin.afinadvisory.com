import { auth } from "@/utils/server/auth";
import { prisma } from "@/utils/server/db";
import { createErrorResponse } from "./apiResponse";

/**
 * @param req Request
 * @param required string | string[]
 * @param mode "ALL" | "ANY" (optional, defaults to "ALL")
 */
export async function requirePermission(req, required, mode = "ALL") {
  const session = await auth();

  if (!session) {
    return [
      createErrorResponse("Unauthorized", 401, "UNAUTHORIZED"),
      null,
      null,
    ];
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    include: {
      permissions: {
        select: { permission: { select: { code: true } } },
      },
    },
  });

  if (!user) {
    return [
      createErrorResponse("Unauthorized", 401, "UNAUTHORIZED"),
      null,
      null,
    ];
  }

  const permissionCodes = user.permissions.map((p) => p.permission.code);

  const normalizedUser = {
    ...user,
    permissions: permissionCodes,
  };

  if (normalizedUser.deleted_at || normalizedUser.status !== "ACTIVE") {
    return [
      createErrorResponse(
        "Account is inactive or suspended",
        401,
        "ACCOUNT_DISABLED",
        { forceLogout: true },
      ),
      null,
      null,
    ];
  }

  if (
    required === undefined ||
    required === null ||
    (Array.isArray(required) && required.length === 0)
  ) {
    return [null, session, normalizedUser];
  }

  const requiredArray = Array.isArray(required) ? required : [required];

  const hasPermission =
    mode === "ANY"
      ? requiredArray.some((perm) => normalizedUser.permissions.includes(perm))
      : requiredArray.every((perm) =>
          normalizedUser.permissions.includes(perm),
        );

  if (!hasPermission) {
    return [
      createErrorResponse("Access Denied", 403, "PERMISSION_DENIED", {
        forceLogout: false,
        reason: "MISSING_PERMISSION",
      }),
      session,
      normalizedUser,
    ];
  }

  return [null, session, normalizedUser];
}

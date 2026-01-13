import { auth } from "@/utils/server/auth";
import { prisma } from "@/utils/server/db";
import { createErrorResponse } from "./apiResponse";

export async function requirePermission(req, required) {
  const session = await auth();

  if (!session) {
    return [createErrorResponse("Unauthorized", 401, "UNAUTHORIZED"), null];
  }

  if (
    required === undefined ||
    required === null ||
    (Array.isArray(required) && required.length === 0)
  ) {
    return [null, session];
  }

  const requiredArray = Array.isArray(required) ? required : [required];

  const user = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      status: true,
      deleted_at: true,
      permissions: {
        select: {
          permission: { select: { code: true } },
        },
      },
    },
  });

  // 🚪 Account invalid → force logout
  if (!user || user.deleted_at || user.status !== "ACTIVE") {
    return [
      createErrorResponse(
        "Account is inactive or suspended",
        401,
        "ACCOUNT_DISABLED",
        {
          forceLogout: true,
        }
      ),
      null,
    ];
  }

  const userPermissions = user.permissions.map((p) => p.permission.code);

  const hasAll = requiredArray.every((perm) => userPermissions.includes(perm));

  if (!hasAll) {
    return [
      createErrorResponse("Access Denied", 403, "PERMISSION_DENIED", {
        forceLogout: false,
        reason: "MISSING_PERMISSION",
      }),
      session,
    ];
  }

  return [null, session];
}

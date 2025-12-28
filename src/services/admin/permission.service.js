import { prisma } from "@/lib/prisma";
import { ValidationError, NotFoundError } from "@/utils/server/errors";

/* ----------------------------------------------
   1) List ALL permissions (for UI checkbox list)
---------------------------------------------- */
export const listAllPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: { code: "asc" },
  });
};

/* ----------------------------------------------
   2) List permissions for a specific user
---------------------------------------------- */
export const listUserPermissions = async (adminUserId) => {
  const rows = await prisma.adminUserPermission.findMany({
    where: { admin_user_id: adminUserId },
    include: { permission: true },
  });

  return rows.map((r) => r.permission.code); // returns codes like "tasks.manage"
};

/* ----------------------------------------------
   3) SYNC permissions using CODES
---------------------------------------------- */
export const syncUserPermissionsByCode = async (
  adminUserId,
  newPermissionCodes = []
) => {
  return prisma.$transaction(async (tx) => {
    // 0) ensure user exists and not deleted
    const user = await tx.adminUser.findFirst({
      where: { id: adminUserId, deleted_at: null },
    });

    if (!user) throw new NotFoundError("User not found or deleted");

    // 1) validate that ALL provided codes exist in Permission table
    const validPermissions = await tx.permission.findMany({
      where: { code: { in: newPermissionCodes } },
      select: { id: true, code: true },
    });

    const validCodes = new Set(validPermissions.map((p) => p.code));

    const invalid = newPermissionCodes.filter((c) => !validCodes.has(c));
    if (invalid.length) {
      throw new ValidationError("One or more permission codes are invalid");
    }

    // convert valid codes to ids
    const codeToId = new Map(validPermissions.map((p) => [p.code, p.id]));
    const desiredIds = new Set(newPermissionCodes.map((c) => codeToId.get(c)));

    // 2) fetch existing permission IDs assigned to user
    const existing = await tx.adminUserPermission.findMany({
      where: { admin_user_id: adminUserId },
      select: { permission_id: true },
    });

    const existingIds = new Set(existing.map((p) => p.permission_id));

    // 3) diff
    const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));

    // 4) apply
    if (toAdd.length) {
      await tx.adminUserPermission.createMany({
        data: toAdd.map((permission_id) => ({
          admin_user_id: adminUserId,
          permission_id,
        })),
        skipDuplicates: true,
      });
    }

    if (toRemove.length) {
      await tx.adminUserPermission.deleteMany({
        where: {
          admin_user_id: adminUserId,
          permission_id: { in: toRemove },
        },
      });
    }

    // 5) return final codes
    const final = await tx.adminUserPermission.findMany({
      where: { admin_user_id: adminUserId },
      include: { permission: true },
    });

    return final.map((r) => r.permission.code);
  });
};

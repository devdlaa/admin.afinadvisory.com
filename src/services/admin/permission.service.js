import { prisma } from "@/utils/server/db.js";
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

  return rows.map((r) => r.permission.code);
};

/* ----------------------------------------------
   3) SYNC permissions using CODES
---------------------------------------------- */
export async function syncUserPermissionsByCode(adminUserId, newCodes = []) {
  return prisma.$transaction(async (tx) => {
    // 1) ensure user exists and not deleted
    const user = await tx.adminUser.findFirst({
      where: { id: adminUserId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // 2) fetch all valid permissions from DB
    const allPermissions = await tx.permission.findMany({
      select: { id: true, code: true },
    });

    const validCodeToId = new Map(allPermissions.map((p) => [p.code, p.id]));

    const validCodes = new Set(validCodeToId.keys());

    // 3) validate requested codes
    const invalid = newCodes.filter((c) => !validCodes.has(c));

    if (invalid.length > 0) {
      throw new ValidationError(
        `Invalid permission codes: ${invalid.join(", ")}`,
      );
    }

    // 4) translate codes -> ids
    const desiredIds = new Set(newCodes.map((c) => validCodeToId.get(c)));

    // 5) fetch existing assignments
    const existing = await tx.adminUserPermission.findMany({
      where: { admin_user_id: adminUserId },
      select: { permission_id: true },
    });

    const existingIds = new Set(existing.map((x) => x.permission_id));

    // 6) diff result
    const toAdd = [...desiredIds].filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !desiredIds.has(id));

    // 7) add new links
    if (toAdd.length > 0) {
      await tx.adminUserPermission.createMany({
        data: toAdd.map((pid) => ({
          admin_user_id: adminUserId,
          permission_id: pid,
        })),
        skipDuplicates: true,
      });
    }

    // 8) remove old links
    if (toRemove.length > 0) {
      await tx.adminUserPermission.deleteMany({
        where: {
          admin_user_id: adminUserId,
          permission_id: { in: toRemove },
        },
      });
    }

    // 9) return final codes for confirmation
    const final = await tx.adminUserPermission.findMany({
      where: { admin_user_id: adminUserId },
      include: { permission: true },
    });

    return final.map((r) => r.permission.code);
  });
}

// ================= CREATE (BULK) =================
export const createPermissions = async (permissions) => {
  const result = await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true, // avoids duplicate code errors
  });

  return {
    created_count: result.count,
  };
};

// ================= UPDATE =================
export const updatePermission = async (id, data) => {
  const existing = await prisma.permission.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Permission not found");
  }

  return prisma.permission.update({
    where: { id },
    data,
  });
};

// ================= BULK UPDATE =================
export const bulkUpdatePermissions = async (updates) => {
  await prisma.$transaction(async (tx) => {
    for (const { id, fields } of updates) {
      await tx.permission.update({
        where: { id },
        data: fields,
      });
    }
  });

  return {
    updated_count: updates.length,
  };
};

// ================= DELETE =================
export const deletePermission = async (id) => {
  const existing = await prisma.permission.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError("Permission not found");
  }

  await prisma.permission.delete({
    where: { id },
  });

  return {
    deleted_id: id,
  };
};

// ================= LIST =================
export const listPermissions = async ({ category, search }) => {
  return prisma.permission.findMany({
    where: {
      ...(category && { category }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { label: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });
};

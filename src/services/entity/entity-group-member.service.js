import { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const syncGroupMembers = async (entity_group_id, members) => {
  return prisma.$transaction(async (tx) => {
    // ensure group exists
    const group = await tx.entityGroup.findUnique({
      where: { id: entity_group_id },
    });

    if (!group) {
      throw new NotFoundError("Entity group not found");
    }

    // extract incoming entity IDs
    const incomingIds = members.map((m) => m.entity_id);

    // validate entities exist
    const entities = await tx.entity.findMany({
      where: {
        id: { in: incomingIds },
        deleted_at: null,
      },
    });

    if (entities.length !== incomingIds.length) {
      throw new ValidationError("One or more entities not found or inactive");
    }

    // fetch existing members
    const existing = await tx.entityGroupMember.findMany({
      where: { entity_group_id },
      select: { entity_id: true },
    });

    const existingIds = existing.map((m) => m.entity_id);

    // find differences
    const toAdd = incomingIds.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !incomingIds.includes(id));

    // remove those not in list anymore
    if (toRemove.length > 0) {
      await tx.entityGroupMember.deleteMany({
        where: {
          entity_group_id,
          entity_id: { in: toRemove },
        },
      });
    }

    // add new members
    if (toAdd.length > 0) {
      await tx.entityGroupMember.createMany({
        data: toAdd.map((entity_id) => ({
          entity_group_id,
          entity_id,
        })),
        skipDuplicates: true,
      });
    }

    // return final synced members
    const finalMembers = await tx.entityGroupMember.findMany({
      where: { entity_group_id },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            entity_type: true,
            email: true,
            primary_phone: true,
            status: true,
          },
        },
      },
      orderBy: { entity: { name: "asc" } },
    });

    return {
      message: "Group members synced successfully",
      count: finalMembers.length,
      members: finalMembers,
    };
  });
};

export const listGroupMembers = async (entity_group_id) => {
  const group = await prisma.entityGroup.findUnique({
    where: { id: entity_group_id },
  });

  if (!group) {
    throw new NotFoundError("Entity group not found");
  }

  const where = { entity_group_id };

  const [items, total] = await Promise.all([
    prisma.entityGroupMember.findMany({
      where,
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            entity_type: true,
            email: true,
            primary_phone: true,
            status: true,
            is_retainer: true,
          },
        },
      },
      orderBy: { entity: { name: "asc" } },
    }),

    prisma.entityGroupMember.count({ where }),
  ]);

  return {
    data: items,
    total: total,
  };
};

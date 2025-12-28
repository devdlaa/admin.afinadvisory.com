import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const addMemberToGroup = async (data) => {
  return prisma.$transaction(async (tx) => {
    const group = await tx.entityGroup.findUnique({
      where: { id: data.entity_group_id },
    });
    if (!group) {
      throw new NotFoundError("Entity group not found");
    }

    const entity = await tx.entity.findFirst({
      where: {
        id: data.entity_id,
        deleted_at: null,
      },
    });
    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // Check if already a member
    const existingMember = await tx.entityGroupMember.findUnique({
      where: {
        entity_group_id_entity_id: {
          entity_group_id: data.entity_group_id,
          entity_id: data.entity_id,
        },
      },
    });
    if (existingMember) {
      throw new ConflictError("Entity is already a member of this group");
    }

    // Add member
    try {
      return await tx.entityGroupMember.create({
        data: {
          entity_group_id: data.entity_group_id,
          entity_id: data.entity_id,
          role: data.role,
        },
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              entity_type: true,
              email: true,
              primary_phone: true,
            },
          },
          group: true,
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        throw new ConflictError("Entity is already a member of this group");
      }
      throw err;
    }
  });
};

export const removeMemberFromGroup = async (id) => {
  const member = await prisma.entityGroupMember.findUnique({
    where: { id },
  });

  if (!member) {
    throw new NotFoundError("Group member not found");
  }

  return prisma.entityGroupMember.delete({
    where: { id },
  });
};

export const updateMemberRole = async (id, role) => {
  const member = await prisma.entityGroupMember.findUnique({
    where: { id },
  });

  if (!member) {
    throw new NotFoundError("Group member not found");
  }

  return prisma.entityGroupMember.update({
    where: { id },
    data: { role },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          entity_type: true,
          email: true,
          primary_phone: true,
        },
      },
      group: true,
    },
  });
};

export const listGroupMembers = async (entity_group_id, filters = {}) => {
  // verify group exists
  const group = await prisma.entityGroup.findUnique({
    where: { id: entity_group_id },
  });

  if (!group) {
    throw new NotFoundError("Entity group not found");
  }

  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.entityGroupMember.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: totalPages,
      has_more: page < totalPages,
    },
  };
};

export const getEntityGroups = async (entity_id) => {
  const entity = await prisma.entity.findFirst({
    where: {
      id: entity_id,
      deleted_at: null,
    },
  });

  if (!entity) {
    throw new NotFoundError("Entity not found");
  }

  return prisma.entityGroupMember.findMany({
    where: { entity_id },
    include: {
      group: true,
    },
  });
};

export const bulkAddMembers = async (entity_group_id, members) => {
  return prisma.$transaction(async (tx) => {
    // Check if group exists
    const group = await tx.entityGroup.findUnique({
      where: { id: entity_group_id },
    });
    if (!group) {
      throw new NotFoundError("Entity group not found");
    }

    // Validate all entities exist
    const entityIds = members.map((m) => m.entity_id);
    const entities = await tx.entity.findMany({
      where: {
        id: { in: entityIds },
        deleted_at: null,
      },
    });

    if (entities.length !== entityIds.length) {
      throw new ValidationError("One or more entities not found");
    }

    // Check for existing members
    const existingMembers = await tx.entityGroupMember.findMany({
      where: {
        entity_group_id,
        entity_id: { in: entityIds },
      },
    });

    if (existingMembers.length > 0) {
      const existingIds = existingMembers.map((m) => m.entity_id);
      throw new ConflictError(
        `Some entities are already members: ${existingIds.join(", ")}`
      );
    }

    // Bulk create
    const created = await tx.entityGroupMember.createMany({
      data: members.map((m) => ({
        entity_group_id,
        entity_id: m.entity_id,
        role: m.role,
      })),
    });

    return created;
  });
};

import { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const createEntityGroup = async (data) => {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("Entity group name is required");
  }

  return prisma.entityGroup.create({
    data: {
      name: data.name.trim(),
      group_type: data.group_type,
    },
  });
};

export const updateEntityGroup = async (id, data) => {
  const group = await prisma.entityGroup.findUnique({
    where: { id },
  });

  if (!group) {
    throw new NotFoundError("Entity group not found");
  }

  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new ValidationError("Entity group name cannot be empty");
  }

  return prisma.entityGroup.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      group_type: data.group_type ?? undefined,
    },
  });
};

export const deleteEntityGroup = async (id) => {
  return prisma.$transaction(async (tx) => {
    const group = await tx.entityGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundError("Entity group not found");
    }

    if (group._count.members > 0) {
      throw new ValidationError(
        "Cannot delete entity group with existing members. Remove members first."
      );
    }

    return tx.entityGroup.delete({ where: { id } });
  });
};

export const listEntityGroups = async (filters = {}) => {
  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  const where = {};

  if (filters.group_type) {
    where.group_type = filters.group_type;
  }

  if (filters.search && filters.search.trim()) {
    where.name = {
      contains: filters.search.trim(),
      mode: "insensitive",
    };
  }

  const [items, total] = await Promise.all([
    prisma.entityGroup.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.entityGroup.count({ where }),
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


export const getEntityGroupById = async (id) => {
  const group = await prisma.entityGroup.findUnique({
    where: { id },
    include: {
      members: {
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
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!group) {
    throw new NotFoundError("Entity group not found");
  }

  return group;
};

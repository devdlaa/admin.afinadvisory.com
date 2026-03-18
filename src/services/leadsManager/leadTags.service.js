import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

export async function createLeadTag(data, admin_user_id) {
  const { name, color, description } = data;

  const existing = await prisma.leadTag.findUnique({
    where: {
      name,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (existing) {
    throw new ValidationError("Lead tag with this name already exists");
  }

  const tag = await prisma.leadTag.create({
    data: {
      name,
      color,
      description,
      created_by: admin_user_id,
    },
  });

  return tag;
}

export async function updateLeadTag(id, data, admin_user_id) {
  const tag = await prisma.leadTag.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: { id: true, name: true },
  });

  if (!tag) {
    throw new NotFoundError("Lead tag not found");
  }

  if (data.name && data.name !== tag.name) {
    const existing = await prisma.leadTag.findUnique({
      where: { name: data.name },
      select: { id: true },
    });

    if (existing) {
      throw new ValidationError("Lead tag with this name already exists");
    }
  }

  const updated = await prisma.leadTag.update({
    where: { id },
    data: {
      ...data,
      updated_by: admin_user_id,
    },
  });

  return updated;
}

export async function deleteLeadTag(id, admin_user_id) {
  const tag = await prisma.leadTag.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!tag) {
    throw new NotFoundError("Lead tag not found");
  }

  const used = await prisma.leadTagMap.findFirst({
    where: { tag_id: id },
    select: { tag_id: true },
  });

  if (used) {
    throw new ValidationError(
      "Lead tag cannot be deleted because it is used in a lead",
    );
  }

  await prisma.leadTag.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      deleted_by: admin_user_id,
      updated_by: admin_user_id,
    },
  });

  return { id };
}

export async function listLeadTags(filters, admin_user_id) {
  const { page = 1, page_size = 20, search } = filters;

  const skip = (page - 1) * page_size;

  const where = {};

  if (search) {
    where.name = {
      contains: search.toUpperCase(),
      mode: "insensitive",
    };
  }

  const [total, tags] = await prisma.$transaction([
    prisma.leadTag.count({ where }),
    prisma.leadTag.findMany({
      where,
      skip,
      take: page_size,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return {
    data: tags,
    pagination: {
      total,
      page,
      per_page: page_size,
      has_more: page * page_size < total,
    },
  };
}

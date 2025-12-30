import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

const toTitleCase = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const createTaskCategory = async (data) => {
  return prisma.$transaction(async (tx) => {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestError("Task category name is required");
    }

    const formattedName = toTitleCase(data.name);

    // Allow only ASCII letters, numbers, and spaces
    if (!/^[A-Za-z0-9 ]+$/.test(formattedName)) {
      throw new BadRequestError(
        "Category name can only contain letters, numbers, and spaces"
      );
    }

    const existingCategory = await tx.taskCategory.findUnique({
      where: { name: formattedName },
    });

    if (existingCategory) {
      throw new ConflictError("Task category with this name already exists");
    }

    const category = await tx.taskCategory.create({
      data: {
        name: formattedName,
        description: data.description?.trim() || null,
        is_active: data.is_active ?? true,
      },
    });

    return category;
  });
};

export const updateTaskCategory = async (category_id, data) => {
  return prisma.$transaction(async (tx) => {
    const category = await tx.taskCategory.findUnique({
      where: { id: category_id },
    });

    if (!category) {
      throw new NotFoundError("Task category not found");
    }

    let formattedName;

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new BadRequestError("Task category name cannot be empty");
      }

      formattedName = toTitleCase(data.name);

      // Allow only ASCII letters, numbers, and spaces
      if (!/^[A-Za-z0-9 ]+$/.test(formattedName)) {
        throw new BadRequestError(
          "Category name can only contain letters, numbers, and spaces"
        );
      }

      // Check uniqueness only if name actually changed
      if (formattedName !== category.name) {
        const existingCategory = await tx.taskCategory.findUnique({
          where: { name: formattedName },
        });

        if (existingCategory) {
          throw new ConflictError(
            "Task category with this name already exists"
          );
        }
      }
    }

    const updatedCategory = await tx.taskCategory.update({
      where: { id: category_id },
      data: {
        name: formattedName,
        description:
          data.description !== undefined
            ? data.description.trim() || null
            : undefined,
        is_active: data.is_active ?? false,
      },
    });

    return updatedCategory;
  });
};

export const deleteTaskCategory = async (category_id) => {
  return prisma.$transaction(async (tx) => {
    const category = await tx.taskCategory.findUnique({
      where: { id: category_id },
      include: {
        tasks: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!category) {
      throw new NotFoundError("Task category not found");
    }

    if (category.tasks.length > 0) {
      throw new ValidationError(
        "Cannot delete category with associated tasks. Please reassign or delete tasks first."
      );
    }

    await tx.taskCategory.delete({
      where: { id: category_id },
    });

    return {
      message: "Task category deleted successfully",
      category_id: category_id,
    };
  });
};

export const getTaskCategoryById = async (category_id) => {
  const category = await prisma.taskCategory.findUnique({
    where: { id: category_id },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!category) {
    throw new NotFoundError("Task category not found");
  }

  return category;
};

export const listTaskCategories = async (filters = {}) => {
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  // boolean normalization
  let isActive;
  if (filters.is_active !== undefined) {
    if (filters.is_active === true || filters.is_active === "true")
      isActive = true;
    if (filters.is_active === false || filters.is_active === "false")
      isActive = false;
  }

  const where = {};

  if (isActive !== undefined) {
    where.is_active = isActive;
  }

  if (filters.search && filters.search.trim()) {
    where.OR = [
      { name: { contains: filters.search.trim(), mode: "insensitive" } },
      { description: { contains: filters.search.trim(), mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.taskCategory.findMany({
      where,
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.taskCategory.count({ where }),
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

export {
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory,
  getTaskCategoryById,
  listTaskCategories,
};

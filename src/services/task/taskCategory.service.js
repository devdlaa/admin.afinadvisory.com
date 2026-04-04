import { prisma } from "@/utils/server/db.js";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const generateCategoryCode = (name) => {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
};

const normalizeForDuplicateCheck = (name) => {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
};

const toTitleCase = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const createTaskCategory = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError("Task category name is required");
    }

    const formattedName = toTitleCase(data.name);

    if (!/^[A-Za-z0-9 _\-\/]+$/.test(formattedName)) {
      throw new ValidationError(
        "Category name can only contain letters, numbers, spaces, hyphens, underscores, and slashes"
      );
    }

    const generatedCode = generateCategoryCode(formattedName);

    const normalizedName = normalizeForDuplicateCheck(formattedName);

    const existingByName = await tx.taskCategory.findFirst({
      where: {
        name: {
          mode: "insensitive",
          equals: normalizedName,
        },
      },
    });

    if (existingByName) {
      throw new ConflictError("Task category with this name already exists");
    }

    const existingByCode = await tx.taskCategory.findUnique({
      where: { code: generatedCode },
    });

    if (existingByCode) {
      throw new ConflictError(
        "A category with a similar name already exists (code conflict)"
      );
    }

    const category = await tx.taskCategory.create({
      data: {
        name: formattedName,
        code: generatedCode,
        description: data.description?.trim() || null,
        created_by: created_by,
        updated_by: created_by,
      },
    });

    return category;
  });
};

export const updateTaskCategory = async (category_id, data, created_by) => {
  return prisma.$transaction(async (tx) => {
    const category = await tx.taskCategory.findUnique({
      where: { id: category_id },
    });

    if (!category) {
      throw new NotFoundError("Task category not found");
    }

    let formattedName;
    let generatedCode;

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new ValidationError("Task category name cannot be empty");
      }

      formattedName = toTitleCase(data.name);

      // Allow only ASCII letters, numbers, spaces, hyphens, underscores, slashes
      if (!/^[A-Za-z0-9 _\-\/]+$/.test(formattedName)) {
        throw new ValidationError(
          "Category name can only contain letters, numbers, spaces, hyphens, underscores, and slashes"
        );
      }

      // Generate new code
      generatedCode = generateCategoryCode(formattedName);

      // Check uniqueness only if name actually changed
      const normalizedNewName = normalizeForDuplicateCheck(formattedName);
      const normalizedOldName = normalizeForDuplicateCheck(category.name);

      if (normalizedNewName !== normalizedOldName) {
        // Check for duplicate name
        const existingByName = await tx.taskCategory.findFirst({
          where: {
            id: { not: category_id },
            name: {
              mode: "insensitive",
              equals: normalizedNewName,
            },
          },
        });

        if (existingByName) {
          throw new ConflictError(
            "Task category with this name already exists"
          );
        }

        // Check for duplicate code
        const existingByCode = await tx.taskCategory.findFirst({
          where: {
            id: { not: category_id },
            code: generatedCode,
          },
        });

        if (existingByCode) {
          throw new ConflictError(
            "A category with a similar name already exists (code conflict)"
          );
        }
      }
    }

    const updatedCategory = await tx.taskCategory.update({
      where: { id: category_id },
      data: {
        name: formattedName,
        code: generatedCode,
        description:
          data.description !== undefined
            ? data.description.trim() || null
            : undefined,
        created_by: created_by,
        updated_by: created_by,
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

  const where = {};

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
      orderBy: { created_at: "desc" },
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

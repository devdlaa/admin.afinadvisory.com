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

export const createBillableModuleCategory = async (data) => {
  return prisma.$transaction(async (tx) => {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestError("Billable module category name is required");
    }

    const formattedName = toTitleCase(data.name);

    // Allow only ASCII letters, numbers, and spaces
    if (!/^[A-Za-z0-9 ]+$/.test(formattedName)) {
      throw new BadRequestError(
        "Category name can only contain letters, numbers, and spaces"
      );
    }

    const existingCategory = await tx.billableModuleCategory.findUnique({
      where: { name: formattedName },
    });

    if (existingCategory) {
      throw new ConflictError(
        "Billable module category with this name already exists"
      );
    }

    const category = await tx.billableModuleCategory.create({
      data: {
        name: formattedName,
        description: data.description?.trim() || null,
        is_active: data.is_active ?? true,
      },
    });

    return category;
  });
};

export const updateBillableModuleCategory = async (category_id, data) => {
  return prisma.$transaction(async (tx) => {
    const category = await tx.billableModuleCategory.findUnique({
      where: { id: category_id },
    });

    if (!category) {
      throw new NotFoundError("Billable module category not found");
    }

    let formattedName;

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new BadRequestError(
          "Billable module category name cannot be empty"
        );
      }

      formattedName = toTitleCase(data.name);

      // Allow only ASCII letters, numbers, and spaces
      if (!/^[A-Za-z0-9 ]+$/.test(formattedName)) {
        throw new BadRequestError(
          "Category name can only contain letters, numbers, and spaces"
        );
      }

      // Check uniqueness only if the name actually changed
      if (formattedName !== category.name) {
        const existingCategory = await tx.billableModuleCategory.findUnique({
          where: { name: formattedName },
        });

        if (existingCategory) {
          throw new ConflictError(
            "Billable module category with this name already exists"
          );
        }
      }
    }

    const updatedCategory = await tx.billableModuleCategory.update({
      where: { id: category_id },
      data: {
        name: formattedName,
        description:
          data.description !== undefined
            ? data.description.trim() || null
            : undefined,
        is_active: data.is_active ?? undefined,
      },
    });

    return updatedCategory;
  });
};

export const deleteBillableModuleCategory = async (category_id) => {
  return prisma.$transaction(async (tx) => {
    const category = await tx.billableModuleCategory.findUnique({
      where: { id: category_id },
      include: {
        modules: {
          where: { is_deleted: false },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!category) {
      throw new NotFoundError("Billable module category not found");
    }

    if (category.modules.length > 0) {
      throw new ValidationError(
        "Cannot delete category with active modules. Please reassign or delete modules first."
      );
    }

    await tx.billableModuleCategory.delete({
      where: { id: category_id },
    });

    return { message: "Billable module category deleted successfully" };
  });
};

export const getBillableModuleCategoryById = async (category_id) => {
  const category = await prisma.billableModuleCategory.findUnique({
    where: { id: category_id },
    include: {
      _count: {
        select: {
          modules: {
            where: { is_deleted: false },
          },
        },
      },
    },
  });

  if (!category) {
    throw new NotFoundError("Billable module category not found");
  }

  return category;
};

export const listBillableModuleCategories = async (filters = {}) => {
  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  // boolean normalization for is_active
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
      {
        name: {
          contains: filters.search.trim(),
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.search.trim(),
          mode: "insensitive",
        },
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.billableModuleCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            modules: {
              where: { is_deleted: false },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.billableModuleCategory.count({ where }),
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
  createBillableModuleCategory,
  updateBillableModuleCategory,
  deleteBillableModuleCategory,
  getBillableModuleCategoryById,
  listBillableModuleCategories,
};

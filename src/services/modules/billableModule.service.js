import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

/**
 * Create service module (was billable module)
 * Purely informational
 */
export const createBillableModule = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    if (!data.name || !data.name.trim()) {
      throw new ValidationError("Module name is required");
    }

    const trimmedName = data.name.trim();

    // Allow only ASCII letters, numbers, spaces, and hyphens
    if (!/^[A-Za-z0-9\- ]+$/.test(trimmedName)) {
      throw new ValidationError(
        "Module name can only contain letters, numbers, spaces, and hyphens"
      );
    }

    // validate category if provided
    if (data.category_id) {
      const categoryExists = await tx.billableModuleCategory.findFirst({
        where: {
          id: data.category_id,
        },
      });

      if (!categoryExists) {
        throw new NotFoundError("Category not found or inactive");
      }
    }

    // enforce unique name (optional but practical)
    const existing = await tx.billableModule.findFirst({
      where: {
        name: trimmedName,
        is_deleted: false,
      },
    });

    if (existing) {
      throw new ConflictError("Module with this name already exists");
    }

    const module = await tx.billableModule.create({
      data: {
        name: trimmedName,
        description: data.description ?? null,
        category_id: data.category_id ?? null,
        created_by,
      },
      include: {
        category: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return module;
  });
};

/**
 * Update service module
 */
export const updateBillableModule = async (module_id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const module = await tx.billableModule.findFirst({
      where: {
        id: module_id,
        is_deleted: false,
      },
    });

    if (!module) {
      throw new NotFoundError("Module not found");
    }

    let trimmedName;

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new ValidationError("Module name cannot be empty");
      }

      trimmedName = data.name.trim();

      if (!/^[A-Za-z0-9\- ]+$/.test(trimmedName)) {
        throw new ValidationError(
          "Module name can only contain letters, numbers, spaces, and hyphens"
        );
      }

      // uniqueness check
      const nameExists = await tx.billableModule.findFirst({
        where: {
          name: trimmedName,
          id: { not: module_id },
          is_deleted: false,
        },
      });

      if (nameExists) {
        throw new ConflictError("Module with this name already exists");
      }
    }

    // validate category
    if (data.category_id) {
      const categoryExists = await tx.billableModuleCategory.findFirst({
        where: {
          id: data.category_id,
        },
      });

      if (!categoryExists) {
        throw new NotFoundError("Category not found or inactive");
      }
    }

    const updatedModule = await tx.billableModule.update({
      where: { id: module_id },
      data: {
        name: trimmedName ?? undefined,
        description: data.description ?? undefined,
        category_id: data.category_id ?? undefined,
        updated_by,
      },
      include: {
        category: true,
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },
      },
    });

    return updatedModule;
  });
};

/**
 * Soft delete service module
 * Block if still used in templates or tasks
 */
export const deleteBillableModule = async (module_id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const module = await tx.billableModule.findFirst({
      where: {
        id: module_id,
        is_deleted: false,
      },
      include: {
        task_modules: {
          where: { is_deleted: false },
          select: { id: true },
          take: 1,
        },
        template_modules: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!module) {
      throw new NotFoundError("Module not found");
    }

    if (module.task_modules.length > 0 || module.template_modules.length > 0) {
      throw new ValidationError(
        "Cannot delete module used in tasks or templates. Remove associations first."
      );
    }

    return tx.billableModule.update({
      where: { id: module_id },
      data: {
        is_deleted: true,
        updated_by: deleted_by,
      },
    });
  });
};

/**
 * Get single service module
 */
export const getBillableModuleById = async (module_id) => {
  const module = await prisma.billableModule.findFirst({
    where: {
      id: module_id,
      is_deleted: false,
    },
    include: {
      category: true,
      creator: { select: { id: true, name: true, email: true } },
      updater: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          task_modules: { where: { is_deleted: false } },
          template_modules: true,
        },
      },
    },
  });

  if (!module) {
    throw new NotFoundError("Module not found");
  }

  return module;
};

/**
 * List service modules
 */
export const listBillableModules = async (filters = {}) => {
  // numeric coercion
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  const where = { is_deleted: false };

  if (filters.category_id) {
    where.category_id = filters.category_id;
  }

  if (filters.search && filters.search.trim()) {
    where.OR = [
      { name: { contains: filters.search.trim(), mode: "insensitive" } },
      { description: { contains: filters.search.trim(), mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.billableModule.findMany({
      where,
      include: {
        category: true,
        creator: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            task_modules: { where: { is_deleted: false } },
            template_modules: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.billableModule.count({ where }),
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

import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const syncTemplateModules = async (task_template_id, modules) => {
  return prisma.$transaction(async (tx) => {
    // 1) Check template exists
    const template = await tx.taskTemplate.findUnique({
      where: { id: task_template_id },
    });

    if (!template) {
      throw new NotFoundError("Task template not found");
    }

    // 2) Get incoming module ids
    const moduleIds = modules.map((m) => m.billable_module_id);

    // 3) De-dupe
    const uniqueModuleIds = [...new Set(moduleIds)];

    // 4) Validate referenced modules exist and are active
    const validModules = await tx.billableModule.findMany({
      where: {
        id: { in: uniqueModuleIds },
        is_active: true,
        is_deleted: false,
      },
    });

    if (validModules.length !== uniqueModuleIds.length) {
      throw new NotFoundError("One or more modules not found or inactive");
    }

    // 5) Load current module relations
    const currentModules = await tx.taskTemplateModule.findMany({
      where: { task_template_id },
      select: {
        id: true,
        billable_module_id: true,
        is_optional: true,
      },
    });

    const currentIds = currentModules.map((m) => m.billable_module_id);

    // 6) Diff: additions and removals
    const toAdd = uniqueModuleIds.filter((id) => !currentIds.includes(id));

    const toRemove = currentModules.filter(
      (m) => !uniqueModuleIds.includes(m.billable_module_id)
    );

    // 7) Remove missing modules
    if (toRemove.length > 0) {
      await tx.taskTemplateModule.deleteMany({
        where: {
          id: { in: toRemove.map((m) => m.id) },
        },
      });
    }

    // 8) Add new modules
    if (toAdd.length > 0) {
      const modulesToAdd = toAdd.map((moduleId) => {
        const incoming = modules.find((m) => m.billable_module_id === moduleId);

        return {
          task_template_id,
          billable_module_id: moduleId,
          is_optional: incoming?.is_optional ?? false,
        };
      });

      await tx.taskTemplateModule.createMany({
        data: modulesToAdd,
      });
    }

    // 9) Update `is_optional` for modules that stayed but changed
    const stayingModules = modules.filter((m) =>
      currentIds.includes(m.billable_module_id)
    );

    for (const mod of stayingModules) {
      const existing = currentModules.find(
        (cm) => cm.billable_module_id === mod.billable_module_id
      );

      // Only update if value actually changed
      if (
        existing &&
        typeof mod.is_optional === "boolean" &&
        existing.is_optional !== mod.is_optional
      ) {
        await tx.taskTemplateModule.updateMany({
          where: {
            task_template_id,
            billable_module_id: mod.billable_module_id,
          },
          data: {
            is_optional: mod.is_optional,
          },
        });
      }
    }

    // 10) Return final canonical list
    const finalModules = await tx.taskTemplateModule.findMany({
      where: { task_template_id },
      include: {
        billableModule: {
          include: { category: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return {
      added: toAdd,
      removed: toRemove.map((m) => m.billable_module_id),
      modules: finalModules,
    };
  });
};

/**
 * List template modules
 */
export const listTemplateModules = async (filters = {}) => {
  const where = {};

  if (filters.task_template_id) {
    where.task_template_id = filters.task_template_id;
  }

  if (filters.billable_module_id) {
    where.billable_module_id = filters.billable_module_id;
  }

  if (filters.is_optional !== undefined) {
    where.is_optional = filters.is_optional;
  }

  return prisma.taskTemplateModule.findMany({
    where,
    include: {
      taskTemplate: {
        select: { id: true, title_template: true, is_active: true },
      },
      billableModule: {
        include: { category: true },
      },
    },
    orderBy: { created_at: "asc" },
  });
};

export { syncTemplateModules, listTemplateModules };

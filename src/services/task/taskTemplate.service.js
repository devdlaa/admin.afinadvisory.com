import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  BadRequestError
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const createTaskTemplate = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    if (!data.title_template || !data.title_template.trim()) {
      throw new BadRequestError("Task template title is required");
    }

    const title = data.title_template.trim();

    // ASCII letters, numbers, space, underscore, hyphen
    if (!/^[A-Za-z0-9 _-]+$/.test(title)) {
      throw new BadRequestError(
        "Task template title can contain only letters, numbers, spaces, hyphens, and underscores"
      );
    }

    const complianceRule = await tx.complianceRule.findFirst({
      where: {
        id: data.compliance_rule_id,
        is_active: true
      }
    });

    if (!complianceRule) {
      throw new NotFoundError("Compliance rule not found or inactive");
    }

    const existingTemplate = await tx.taskTemplate.findFirst({
      where: {
        compliance_rule_id: data.compliance_rule_id,
        title_template: title
      }
    });

    if (existingTemplate) {
      throw new ConflictError(
        "A task template with this title already exists for this compliance"
      );
    }

    const template = await tx.taskTemplate.create({
      data: {
        compliance_rule_id: data.compliance_rule_id,
        title_template: title,
        description_template: data.description_template?.trim() || null,
        is_active: data.is_active ?? true,
        created_by
      },
      include: {
        complianceRule: true,
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return template;
  });
};

export const updateTaskTemplate = async (template_id, data) => {
  return prisma.$transaction(async (tx) => {
    const template = await tx.taskTemplate.findUnique({
      where: { id: template_id }
    });

    if (!template) {
      throw new NotFoundError("Task template not found");
    }

    let title;

    // title validation when provided
    if (data.title_template !== undefined) {
      if (!data.title_template.trim()) {
        throw new BadRequestError("Task template title cannot be empty");
      }

      title = data.title_template.trim();

      if (!/^[A-Za-z0-9 _-]+$/.test(title)) {
        throw new BadRequestError(
          "Task template title can contain only letters, numbers, spaces, hyphens, and underscores"
        );
      }

      if (title !== template.title_template) {
        const existingTemplate = await tx.taskTemplate.findFirst({
          where: {
            compliance_rule_id:
              data.compliance_rule_id ?? template.compliance_rule_id,
            title_template: title
          }
        });

        if (existingTemplate) {
          throw new ConflictError(
            "A task template with this title already exists for this compliance"
          );
        }
      }
    }

    // validate new compliance rule if changed
    if (
      data.compliance_rule_id &&
      data.compliance_rule_id !== template.compliance_rule_id
    ) {
      const complianceRule = await tx.complianceRule.findFirst({
        where: {
          id: data.compliance_rule_id,
          is_active: true
        }
      });

      if (!complianceRule) {
        throw new NotFoundError("Compliance rule not found or inactive");
      }
    }

    const updatedTemplate = await tx.taskTemplate.update({
      where: { id: template_id },
      data: {
        compliance_rule_id: data.compliance_rule_id ?? undefined,
        title_template: title ?? undefined,
        description_template:
          data.description_template !== undefined
            ? data.description_template.trim() || null
            : undefined,
        is_active: data.is_active ?? undefined
      },
      include: {
        complianceRule: true,
        creator: {
          select: { id: true, name: true, email: true }
        },
        modules: {
          include: {
            billableModule: true
          }
        }
      }
    });

    return updatedTemplate;
  });
};

export const deleteTaskTemplate = async (template_id) => {
  return prisma.$transaction(async (tx) => {
    const template = await tx.taskTemplate.findUnique({
      where: { id: template_id },
      include: { modules: true }
    });

    if (!template) {
      throw new NotFoundError("Task template not found");
    }

    if (template.modules.length > 0) {
      await tx.taskTemplateModule.deleteMany({
        where: { task_template_id: template_id }
      });
    }

    await tx.taskTemplate.delete({
      where: { id: template_id }
    });

    return { message: "Task template deleted successfully" };
  });
};

export const getTaskTemplateById = async (template_id) => {
  const template = await prisma.taskTemplate.findUnique({
    where: { id: template_id },
    include: {
      complianceRule: {
        include: {
          registrationType: true
        }
      },
      creator: {
        select: { id: true, name: true, email: true }
      },
      modules: {
        include: {
          billableModule: {
            include: {
              category: true
            }
          }
        },
        orderBy: {
          created_at: "asc"
        }
      }
    }
  });

  if (!template) {
    throw new NotFoundError("Task template not found");
  }

  return template;
};

export const listTaskTemplates = async (filters = {}) => {
  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  // boolean normalization for is_active
  let isActive;
  if (filters.is_active !== undefined) {
    if (filters.is_active === true || filters.is_active === "true") isActive = true;
    if (filters.is_active === false || filters.is_active === "false") isActive = false;
  }

  const where = {};

  if (isActive !== undefined) {
    where.is_active = isActive;
  }

  if (filters.compliance_rule_id) {
    where.compliance_rule_id = filters.compliance_rule_id;
  }

  if (filters.search && filters.search.trim()) {
    where.OR = [
      {
        title_template: {
          contains: filters.search.trim(),
          mode: "insensitive"
        }
      },
      {
        description_template: {
          contains: filters.search.trim(),
          mode: "insensitive"
        }
      }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.taskTemplate.findMany({
      where,
      include: {
        complianceRule: {
          include: {
            registrationType: true
          }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        _count: { select: { modules: true } }
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),

    prisma.taskTemplate.count({ where })
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: totalPages,
      has_more: page < totalPages
    }
  };
};

export {
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  getTaskTemplateById,
  listTaskTemplates
};

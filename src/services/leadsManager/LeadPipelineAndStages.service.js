import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

export async function createLeadPipeline(data, admin_user_id) {
  const { company_profile_id, name, description, icon, stages } = data;

  const companyProfile = await prisma.companyProfile.findFirst({
    where: {
      id: company_profile_id,
      is_active: true,
    },
    select: { id: true },
  });

  if (!companyProfile) {
    throw new ValidationError("Invalid or inactive company profile");
  }

  const duplicate = await prisma.leadPipeline.findFirst({
    where: {
      company_profile_id,
      name,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new ValidationError("Pipeline with same name already exists");
  }

  return prisma.$transaction(async (tx) => {
    const pipeline = await tx.leadPipeline.create({
      data: {
        company_profile_id,
        name,
        description,
        icon,
        created_by: admin_user_id,
        updated_by: admin_user_id,
      },
    });

    const stageData = [];

    stages.forEach((stage, index) => {
      stageData.push({
        pipeline_id: pipeline.id,
        name: stage.name,
        stage_order: index + 1,
        created_by: admin_user_id,
        updated_by: admin_user_id,
      });
    });

    const baseOrder = stages.length;

    stageData.push({
      pipeline_id: pipeline.id,
      name: "Won",
      stage_order: baseOrder + 1,
      is_closed: true,
      is_won: true,
      created_by: admin_user_id,
      updated_by: admin_user_id,
    });

    stageData.push({
      pipeline_id: pipeline.id,
      name: "Lost",
      stage_order: baseOrder + 2,
      is_closed: true,
      is_won: false,
      created_by: admin_user_id,
      updated_by: admin_user_id,
    });

    await tx.leadPipelineStage.createMany({
      data: stageData,
    });

    return tx.leadPipeline.findUnique({
      where: { id: pipeline.id },
      include: {
        stages: {
          orderBy: { stage_order: "asc" },
        },
      },
    });
  });
}

export async function updateLeadPipeline(id, data, admin_user_id) {
  const { name, description, icon, stages, company_profile_id } = data;

  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      stages: true,
    },
  });

  if (!pipeline) {
    throw new NotFoundError("Lead pipeline not found");
  }
  if (name) {
    const duplicate = await prisma.leadPipeline.findFirst({
      where: {
        id: { not: id },
        company_profile_id: company_profile_id || pipeline.company_profile_id,
        name,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ValidationError("Pipeline with same name already exists");
    }
  }

  if (company_profile_id) {
    const companyProfile = await prisma.companyProfile.findFirst({
      where: {
        id: company_profile_id,
        is_active: true,
      },
      select: { id: true },
    });

    if (!companyProfile) {
      throw new ValidationError("Invalid or inactive company profile");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (name || description !== undefined || icon !== undefined) {
      await tx.leadPipeline.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(icon !== undefined && { icon }),
          ...(company_profile_id && { company_profile_id }),
          updated_by: admin_user_id,
        },
      });
    }

    if (stages) {
      const existingStages = pipeline.stages;

      const systemStages = existingStages.filter((s) => s.is_closed);
      const userStages = existingStages.filter((s) => !s.is_closed);

      const existingMap = new Map(userStages.map((s) => [s.id, s]));

      const incomingIds = stages.filter((s) => s.id).map((s) => s.id);

      const toDelete = userStages.filter((s) => !incomingIds.includes(s.id));

      if (toDelete.length > 0) {
        const leadsExist = await tx.lead.findFirst({
          where: {
            stage_id: { in: toDelete.map((s) => s.id) },
          },
          select: { id: true },
        });

        if (leadsExist) {
          throw new ValidationError(
            "Cannot delete stage because leads exist in it",
          );
        }

        await tx.leadPipelineStage.deleteMany({
          where: {
            id: { in: toDelete.map((s) => s.id) },
          },
        });
      }

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const order = i + 1;

        if (stage.id && existingMap.has(stage.id)) {
          await tx.leadPipelineStage.update({
            where: { id: stage.id },
            data: {
              name: stage.name,
              stage_order: order,
              updated_by: admin_user_id,
            },
          });
        } else {
          await tx.leadPipelineStage.create({
            data: {
              pipeline_id: id,
              name: stage.name,
              stage_order: order,
              created_by: admin_user_id,
              updated_by: admin_user_id,
            },
          });
        }
      }

      const baseOrder = stages.length;

      const wonStage = systemStages.find((s) => s.is_won);
      const lostStage = systemStages.find((s) => !s.is_won);

      if (wonStage) {
        await tx.leadPipelineStage.update({
          where: { id: wonStage.id },
          data: {
            stage_order: baseOrder + 1,
            updated_by: admin_user_id,
          },
        });
      }

      if (lostStage) {
        await tx.leadPipelineStage.update({
          where: { id: lostStage.id },
          data: {
            stage_order: baseOrder + 2,
            updated_by: admin_user_id,
          },
        });
      }
    }

    return tx.leadPipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { stage_order: "asc" },
        },
      },
    });
  });
}

export async function deleteLeadPipeline(id, admin_user_id) {
  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!pipeline) {
    throw new NotFoundError("Lead pipeline not found");
  }

  const leadExists = await prisma.lead.findFirst({
    where: {
      pipeline_id: id,
    },
    select: { id: true },
  });

  if (leadExists) {
    throw new ValidationError(
      "Pipeline cannot be deleted because leads are using it",
    );
  }

  await prisma.leadPipeline.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      deleted_by: admin_user_id,
      updated_by: admin_user_id,
    },
  });

  return { id };
}

export async function getLeadPipelineById(id, admin_user_id) {
  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      stages: {
        orderBy: { stage_order: "asc" },
      },
      company_profile: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!pipeline) {
    throw new NotFoundError("Lead pipeline not found");
  }

  return pipeline;
}

export async function listLeadPipelines(filters = {}) {
  const page = Math.max(parseInt(filters.page) || 1, 1);

  const pageSize = Math.min(Math.max(parseInt(filters.page_size) || 20, 1), 50);

  const search = filters.search?.trim();

  const where = {
    deleted_at: null,

    ...(filters.company_profile_id && {
      company_profile_id: filters.company_profile_id,
    }),

    ...(search && {
      name: {
        contains: search,
        mode: "insensitive",
      },
    }),
  };

  const [items, total] = await Promise.all([
    prisma.leadPipeline.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        is_default: true,
        company_profile_id: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.leadPipeline.count({ where }),
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
}

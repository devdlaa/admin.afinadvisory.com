import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

function sanitizeStageName(name) {
  if (!name || typeof name !== "string") return "";

  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export async function createLeadPipeline(data, admin_user_id) {
  const { company_profile_id, name, description, icon, is_default } = data;

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
        is_default,
        created_by: admin_user_id,
        updated_by: admin_user_id,
      },
    });

    const stageData = [];

    const baseOrder = 0;

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
        company_profile: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updater: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  });
}

export async function updateLeadPipeline(id, data, admin_user_id) {
  const { name, description, icon, stages, company_profile_id, is_default } =
    data;

  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: {
      id: true,
      company_profile_id: true,
      stages: {
        where: { deleted_at: null },
      },
    },
  });

  if (!pipeline) {
    throw new NotFoundError("Lead pipeline not found");
  }

  // SYSTEM-STAGES VALIDATION
  if (stages) {
    const normalized = (name) => name?.trim().toLowerCase();

    const invalidStage = stages.find((s) =>
      ["won", "lost"].includes(normalized(s.name)),
    );

    if (invalidStage) {
      throw new ValidationError("Won/Lost stages cannot be modified");
    }

    const systemStageIds = pipeline.stages
      .filter((s) => s.is_closed)
      .map((s) => s.id);

    const touchingSystemStage = stages.find(
      (s) => s.id && systemStageIds.includes(s.id),
    );

    if (touchingSystemStage) {
      throw new ValidationError("System stages cannot be modified");
    }
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
    if (is_default === true) {
      const existingDefault = await tx.leadPipeline.findFirst({
        where: {
          id: { not: id },
          company_profile_id: company_profile_id || pipeline.company_profile_id,
          is_default: true,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (existingDefault) {
        await tx.leadPipeline.update({
          where: { id: existingDefault.id },
          data: {
            is_default: false,
            updated_by: admin_user_id,
          },
        });
      }
    }

    if (
      name ||
      description !== undefined ||
      icon !== undefined ||
      company_profile_id ||
      is_default !== undefined
    ) {
      await tx.leadPipeline.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(icon !== undefined && { icon }),
          ...(company_profile_id && { company_profile_id }),
          ...(is_default !== undefined && { is_default }),
          updated_by: admin_user_id,
        },
      });
    }

    if (stages) {
      const existingStages = pipeline.stages;

      const systemStages = existingStages.filter((s) => s.is_closed);
      const userStages = existingStages.filter((s) => !s.is_closed);

      const existingMap = new Map(userStages.map((s) => [s.id, s]));
      const systemStageIds = new Set(systemStages.map((s) => s.id));

      const incomingIds = stages.filter((s) => s.id).map((s) => s.id);

      const missingStage = userStages.find((s) => !incomingIds.includes(s.id));

      if (missingStage) {
        throw new ValidationError(
          `Stage "${missingStage.name}" cannot be removed here. Use the delete stage endpoint to safely migrate leads first.`,
        );
      }

      // ── GUARD 2: closed stages order cannot be updated ───────────────────
      const openIncomingStages = stages.filter(
        (s) => !s.id || !systemStageIds.has(s.id),
      );

      for (let i = 0; i < openIncomingStages.length; i++) {
        const stage = openIncomingStages[i];
        const order = i + 1;

        if (stage.id && existingMap.has(stage.id)) {
          await tx.leadPipelineStage.update({
            where: { id: stage.id },
            data: {
              name: sanitizeStageName(stage.name),
              stage_order: order,
              updated_by: admin_user_id,
            },
          });
        } else {
          await tx.leadPipelineStage.create({
            data: {
              pipeline_id: id,
              name: sanitizeStageName(stage.name),
              stage_order: order,
              created_by: admin_user_id,
              updated_by: admin_user_id,
            },
          });
        }
      }

      const baseOrder = openIncomingStages.length;

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
          where: { deleted_at: null },
          orderBy: { stage_order: "asc" },
        },
        company_profile: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        updater: {
          select: { id: true, name: true, email: true },
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
      "Pipeline cannot be deleted because there are leads in the stages.",
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

export async function getLeadPipelineById(id) {
  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      stages: {
        where: { deleted_at: null },
        orderBy: { stage_order: "asc" },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
      updater: {
        select: { id: true, name: true, email: true },
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

  const baseWhere = {
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

  const defaultWhere = {
    ...baseWhere,
    is_default: true,
  };

  const nonDefaultWhere = {
    ...baseWhere,
    is_default: false,
  };

  // ── Page 1 (special handling) ───────────────────────────────────
  if (page === 1) {
    const [
      defaultPipeline,
      firstNonDefaultHydrated,
      nonDefaultItems,
      totalNonDefault,
    ] = await Promise.all([
      // Default (hydrated)
      prisma.leadPipeline.findFirst({
        where: defaultWhere,
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          is_default: true,
          company_profile_id: true,
          created_at: true,
          updated_at: true,
          stages: {
            where: { deleted_at: null },
            orderBy: { stage_order: "asc" },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          updater: {
            select: { id: true, name: true, email: true },
          },
          company_profile: {
            select: { id: true, name: true },
          },
        },
      }),

      // First non-default (hydrated fallback)
      prisma.leadPipeline.findFirst({
        where: nonDefaultWhere,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          is_default: true,
          company_profile_id: true,
          created_at: true,
          updated_at: true,
          stages: {
            where: { deleted_at: null },
            orderBy: { stage_order: "asc" },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
          updater: {
            select: { id: true, name: true, email: true },
          },
          company_profile: {
            select: { id: true, name: true },
          },
        },
      }),

      // Remaining non-default (lean)
      prisma.leadPipeline.findMany({
        where: nonDefaultWhere,
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
        skip: 0,
        take: pageSize,
      }),

      prisma.leadPipeline.count({
        where: nonDefaultWhere,
      }),
    ]);

    let data = [];

    if (defaultPipeline) {
      data = [defaultPipeline, ...nonDefaultItems];
    } else if (firstNonDefaultHydrated) {
      const rest = nonDefaultItems.filter(
        (p) => p.id !== firstNonDefaultHydrated.id,
      );
      data = [firstNonDefaultHydrated, ...rest];
    } else {
      data = [];
    }

    const totalItems = totalNonDefault + (defaultPipeline ? 1 : 0);
    const totalPages = Math.ceil(totalNonDefault / pageSize);

    return {
      data,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    };
  }

  // ── Page > 1 (lean only, optimized) ─────────────────────────────
  const [nonDefaultItems, totalNonDefault] = await Promise.all([
    prisma.leadPipeline.findMany({
      where: nonDefaultWhere,
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

    prisma.leadPipeline.count({
      where: nonDefaultWhere,
    }),
  ]);

  const totalPages = Math.ceil(totalNonDefault / pageSize);

  return {
    data: nonDefaultItems,
    pagination: {
      page,
      page_size: pageSize,
      total_items: totalNonDefault,
      total_pages: totalPages,
      has_more: page < totalPages,
    },
  };
}

export async function deleteLeadPipelineStage(
  pipeline_id,
  data,
  admin_user_id,
) {
  const { stage_id, migrate_to_stage_id, migrate_to_new_stage_name } = data;

  /* ─── 0. Required validation ───────────────────── */
  if (!migrate_to_stage_id && !migrate_to_new_stage_name) {
    throw new ValidationError("Target stage is required for migration");
  }

  return prisma.$transaction(async (tx) => {
    const adminUser = await tx.adminUser.findFirst({
      where: {
        id: admin_user_id,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!adminUser) {
      throw new NotFoundError("Invalid admin user");
    }

    /* ─── 1. Validate stage to delete ─────────────── */
    const [stageToDelete] = await tx.$queryRaw`
      SELECT id, is_closed
      FROM "LeadPipelineStage"
      WHERE id          = ${stage_id}::uuid
        AND pipeline_id = ${pipeline_id}::uuid
        AND deleted_at  IS NULL
      LIMIT 1
    `;

    if (!stageToDelete) {
      throw new NotFoundError("Stage not found in this pipeline");
    }

    if (stageToDelete.is_closed) {
      throw new ValidationError("System stages (Won/Lost) cannot be deleted");
    }
    /* ─── 2. Resolve open stages if to_move_to stage is an existing stage stage ─────────────────── */
    if (!migrate_to_new_stage_name) {
      const [{ openStages }] = await tx.$queryRaw`
          SELECT COUNT(*)::int AS "openStages"
          FROM "LeadPipelineStage"
          WHERE pipeline_id = ${pipeline_id}::uuid
            AND is_closed   = false
            AND deleted_at  IS NULL
        `;

      if (openStages <= 1) {
        throw new ValidationError("At least one open stage must exist");
      }
    }

    /* ─── 2. Resolve target stage ─────────────────── */
    let target_stage_id = migrate_to_stage_id ?? null;

    if (migrate_to_stage_id) {
      if (migrate_to_stage_id === stage_id) {
        throw new ValidationError("Cannot migrate to the same stage");
      }

      const [targetStage] = await tx.$queryRaw`
      SELECT id, is_closed
      FROM "LeadPipelineStage"
      WHERE id          = ${migrate_to_stage_id}::uuid
        AND pipeline_id = ${pipeline_id}::uuid
        AND deleted_at  IS NULL
      LIMIT 1
    `;

      if (!targetStage) {
        throw new NotFoundError("Target stage not found");
      }
      if (targetStage.is_closed) {
        throw new ValidationError(
          "Cannot migrate leads to a closed stage (Won/Lost)",
        );
      }
    }

    /* ─── 3. Create new stage if needed ───────────── */
    if (migrate_to_new_stage_name) {
      const [duplicate] = await tx.$queryRaw`
        SELECT id
        FROM "LeadPipelineStage"
        WHERE pipeline_id = ${pipeline_id}::uuid
          AND LOWER(name) = LOWER(${migrate_to_new_stage_name})
          AND deleted_at  IS NULL
        LIMIT 1
      `;

      if (duplicate) {
        throw new ValidationError("Stage with same name already exists");
      }

      const [maxRow] = await tx.$queryRaw`
        SELECT COALESCE(MAX(stage_order), 0) AS max_order
        FROM "LeadPipelineStage"
        WHERE pipeline_id = ${pipeline_id}::uuid
          AND is_closed   = false
          AND deleted_at  IS NULL
          AND id         != ${stage_id}::uuid
      `;

      const [newStage] = await tx.$queryRaw`
      INSERT INTO "LeadPipelineStage" (
        id, pipeline_id, name, stage_order,
        is_closed, is_won, created_at, created_by, updated_by
      )
      VALUES (
        gen_random_uuid(),
        ${pipeline_id}::uuid,
        ${migrate_to_new_stage_name},
        ${Number(maxRow.max_order) + 1},
        ${false}::boolean,
        ${false}::boolean,
        NOW(),
        ${admin_user_id}::uuid,
        ${admin_user_id}::uuid
      )
      RETURNING id
    `;

      target_stage_id = newStage.id;
    }

    /* ─── 4. Fetch affected leads ─────────────────── */
    const [{ count }] = await tx.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "Lead"
      WHERE stage_id   = ${stage_id}::uuid
         AND pipeline_id = ${pipeline_id}::uuid
          AND deleted_at IS NULL
    `;

    /* ─── 5. Move leads ───────────────────────────── */
    await tx.$queryRaw`
      UPDATE "Lead"
      SET
        stage_id         = ${target_stage_id}::uuid,
        stage_updated_at = NOW(),
        stage_updated_by = ${admin_user_id}::uuid,
        updated_at       = NOW(),
        updated_by       = ${admin_user_id}::uuid
      WHERE stage_id   = ${stage_id}::uuid
         AND pipeline_id = ${pipeline_id}::uuid
          AND deleted_at IS NULL
    `;

    /* ─── 6. Insert bulk operation log ───────────── */
    if (count > 0) {
      await tx.$queryRaw`
    INSERT INTO "LeadStageBulkOperation" (
      id,
      pipeline_id,
      from_stage_id,
      to_stage_id,
      total_leads,
      changed_by,
      changed_at,
      note
    )
    VALUES (
      gen_random_uuid(),
      ${pipeline_id}::uuid,
      ${stage_id}::uuid,
      ${target_stage_id}::uuid,
      ${count},
      ${admin_user_id}::uuid,
      NOW(),
      'Stage migration — bulk move due to stage deletion'
    )
  `;
    }

    /* ─── 7. Soft delete stage ───────────────────── */
    await tx.$queryRaw`
      UPDATE "LeadPipelineStage"
      SET
        deleted_at = NOW(),
        deleted_by = ${admin_user_id}::uuid
      WHERE id = ${stage_id}::uuid
    `;

    /* ─── 8. Resequence open stages ─────────────── */
    await tx.$queryRaw`
      UPDATE "LeadPipelineStage" AS lps
      SET
        stage_order = reordered.new_order,
        updated_by  = ${admin_user_id}::uuid
      FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (ORDER BY stage_order ASC) AS new_order
        FROM "LeadPipelineStage"
        WHERE pipeline_id = ${pipeline_id}::uuid
          AND is_closed   = false
          AND deleted_at  IS NULL
      ) AS reordered
      WHERE lps.id = reordered.id
    `;

    /* ─── 9. Pin Won / Lost ─────────────────────── */
    const [{ open_count }] = await tx.$queryRaw`
      SELECT COUNT(*)::int AS open_count
      FROM "LeadPipelineStage"
      WHERE pipeline_id = ${pipeline_id}::uuid
        AND is_closed   = false
        AND deleted_at  IS NULL
    `;

    await tx.$queryRaw`
      UPDATE "LeadPipelineStage"
      SET stage_order = ${open_count + 1},
          updated_by  = ${admin_user_id}::uuid
      WHERE pipeline_id = ${pipeline_id}::uuid
        AND is_closed   = true
        AND is_won      = true
    `;

    await tx.$queryRaw`
      UPDATE "LeadPipelineStage"
      SET stage_order = ${open_count + 2},
          updated_by  = ${admin_user_id}::uuid
      WHERE pipeline_id = ${pipeline_id}::uuid
        AND is_closed   = true
        AND is_won      = false
    `;

    /* ─── 10. Return final pipeline ─────────────── */
    return tx.leadPipeline.findUnique({
      where: { id: pipeline_id },
      include: {
        stages: {
          where: { deleted_at: null },
          orderBy: { stage_order: "asc" },
        },
        company_profile: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        updater: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  });
}

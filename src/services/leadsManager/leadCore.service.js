import { prisma } from "@/utils/server/db";
import { Prisma } from "@prisma/client";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";
import { handleLeadStageChange } from "./analytics/orchestrator";
import { onLeadCreated, onLeadAssignedBulk } from "./analytics/aggregator";
import { SYSTEM_USER_ID } from "./analytics/aggregator";
import { addLeadActivityLog } from "../shared/comments.service";
import { buildActivityMessage } from "@/utils/server/activityBulder";
import { listPinnedLeadComments } from "../shared/comments.service";
import { REMINDER_TAG_COLORS } from "../reminders/reminder.constants";
import { notify } from "../shared/notifications.service";

export async function createLead(payload, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  Defaults
  ---------------------------------------- */

  let expectedCloseDate = payload.expected_close_date
    ? new Date(payload.expected_close_date)
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  /* ----------------------------------------
  Validate Core Entities
  ---------------------------------------- */

  let [pipeline, company, contact] = await Promise.all([
    prisma.leadPipeline.findFirst({
      where: {
        id: payload.pipeline_id,
        deleted_at: null,
      },
      select: { id: true, name: true },
    }),

    prisma.companyProfile.findFirst({
      where: {
        id: payload.company_profile_id,
        is_active: true,
      },
      select: { id: true, name: true },
    }),

    prisma.leadContact.findFirst({
      where: {
        id: payload.lead_contact_id,
      },
      select: { id: true, contact_person: true },
    }),
  ]);

  if (!pipeline) {
    throw new ValidationError("Invalid pipeline");
  }

  if (!company) {
    throw new ValidationError("Invalid or inactive company profile");
  }

  if (!contact) {
    throw new ValidationError("Invalid lead contact");
  }

  // AUTO REVIVE DELTED LEAD CONTACT
  if (contact.deleted_at !== null) {
    contact = await prisma.leadContact.update({
      where: { id: contact.id },
      data: {
        deleted_at: null,
        updated_by: adminUserId,
      },
    });
  }

  /* ----------------------------------------
  Resolve Default Stage
  ---------------------------------------- */

  const stage = await prisma.leadPipelineStage.findFirst({
    where: {
      pipeline_id: payload.pipeline_id,
      is_closed: false,
      deleted_at: null,
    },
    orderBy: {
      stage_order: "asc",
    },
    select: { id: true, name: true },
  });

  if (!stage) {
    throw new ValidationError(
      "This pipeline has only closed stages. Please add at least one open stage.",
    );
  }

  /* ----------------------------------------
  Validate Tags
  ---------------------------------------- */

  let validTagIds = [];

  if (payload.tags?.length) {
    const tags = await prisma.leadTag.findMany({
      where: {
        id: { in: payload.tags },
        deleted_at: null,
      },
      select: { id: true },
    });

    if (tags.length !== payload.tags.length) {
      throw new ValidationError("One or more tags are invalid");
    }

    validTagIds = tags.map((t) => t.id);
  }

  /* ----------------------------------------
  Validate Reference
  ---------------------------------------- */

  const ref = payload.reference;
  // reference types
  let LEAD_REFERENCE_RETRIVED = null;

  if (ref) {
    if (ref.type === "INFLUENCER") {
      LEAD_REFERENCE_RETRIVED = await prisma.influencer.findFirst({
        where: {
          id: ref.influencer_id,
          deleted_at: null,
        },
        select: { id: true, name: true },
      });

      if (!LEAD_REFERENCE_RETRIVED) {
        throw new ValidationError("Invalid influencer reference");
      }
    }

    if (ref.type === "ENTITY") {
      LEAD_REFERENCE_RETRIVED = await prisma.entity.findUnique({
        where: { id: ref.entity_id },
        select: { id: true, name: true },
      });

      if (!LEAD_REFERENCE_RETRIVED) {
        throw new ValidationError("Invalid entity reference");
      }
    }

    if (ref.type === "LEAD_CONTACT") {
      LEAD_REFERENCE_RETRIVED = await prisma.leadContact.findFirst({
        where: {
          id: ref.lead_contact_id,
          deleted_at: null,
        },
        select: { id: true, contact_person: true, company_name: true },
      });

      if (!LEAD_REFERENCE_RETRIVED) {
        throw new ValidationError("Invalid lead contact reference");
      }
    }
  }

  /* ----------------------------------------
  Transaction
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    /* Create Lead */

    const lead = await tx.lead.create({
      data: {
        title: payload.title,
        description: payload.description,

        pipeline_id: payload.pipeline_id,
        stage_id: stage.id,

        company_profile_id: payload.company_profile_id,
        lead_contact_id: payload.lead_contact_id,

        priority: payload.priority,

        expected_close_date: expectedCloseDate,

        created_by: adminUserId,
        updated_by: adminUserId,
      },
      select: {
        id: true,
        title: true,
        pipeline_id: true,
        stage_id: true,
        priority: true,
        created_at: true,
      },
    });

    /* Source Data */
    await tx.leadSourceData.create({
      data: {
        lead_id: lead.id,
        source: payload.source,
        is_system: payload.source == "MANUAL",

        external_id: payload.source_data?.external_id || null,
        raw_payload: payload.source_data?.raw_payload || null,
      },
    });
    /* Reference */

    if (ref) {
      await tx.leadReference.create({
        data: {
          lead_id: lead.id,
          type: ref.type,

          influencer_id: ref.influencer_id,
          entity_id: ref.entity_id,
          lead_contact_id: ref.lead_contact_id,

          name: ref.name,
          phone: ref.phone,
          email: ref.email,
        },
      });
    }

    /* Tags */

    if (validTagIds.length) {
      await tx.leadTagMap.createMany({
        data: validTagIds.map((tagId) => ({
          lead_id: lead.id,
          tag_id: tagId,
        })),
      });
    }

    // Assign creator as OWNER
    await tx.leadAssignment.create({
      data: {
        lead_id: lead.id,
        admin_user_id: adminUserId,
        role: "OWNER",
        assigned_by: adminUserId,
      },
    });

    /* ----------------------------------------
     CREATE LEAD ANALYTICS 
  ---------------------------------------- */

    const analyticsLead = {
      id: lead.id,
      pipelineId: lead.pipeline_id,
      stageId: lead.stage_id,
      source: payload.source || null,
      companyProfileId: payload.company_profile_id,
    };

    // 1. Lead created
    await onLeadCreated(tx, analyticsLead, adminUserId);

    // 2. Lead assigned (OWNER)
    await onLeadAssignedBulk(tx, analyticsLead, [adminUserId]);

    return lead;
  });

  // CHANGE-LOG
  const hasEmailContext = !!payload.email;

  const changes = [
    {
      action: "LEAD_CREATED",
      from: null,
      to: {
        title: result.title,
        priority: result.priority,

        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
        },

        stage: {
          id: stage.id,
          name: stage.name,
        },

        company: {
          id: company.id,
          name: company.name,
        },

        contact: {
          id: contact.id,
          name: contact.contact_person,
        },

        reference: ref
          ? {
              id: LEAD_REFERENCE_RETRIVED?.id || null,
              reference_type: ref.type,
              name:
                LEAD_REFERENCE_RETRIVED?.name ||
                LEAD_REFERENCE_RETRIVED?.contact_person ||
                null,
            }
          : null,

        has_email_context: hasEmailContext,

        ...(hasEmailContext && {
          email_meta: {
            has_attachments: !!payload.email?.attachments?.length,
            attachments_count: payload.email?.attachments?.length || 0,
          },
        }),
      },
    },
  ];

  await addLeadActivityLog(result.id, adminUserId, {
    action: "LEAD_CREATED",
    message: buildActivityMessage(changes),
    meta: { changes },
  });

  const fullLead = await prisma.lead.findUnique({
    where: { id: result.id },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      expected_close_date: true,
      created_at: true,
      updated_at: true,
      ai_summary: true,
      ai_summary_generated_at: true,
      stage_updated_at: true,

      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },

      assignments: {
        select: { id: true },
      },
    },
  });

  return {
    id: fullLead.id,
    title: fullLead.title,
    description: fullLead.description,
    priority: fullLead.priority,
    expected_close_date: fullLead.expected_close_date,
    created_at: fullLead.created_at,
    updated_at: fullLead.updated_at,
    ai_summary: fullLead.ai_summary,
    ai_summary_generated_at: fullLead.ai_summary_generated_at,
    stage_updated_at: fullLead.stage_updated_at,
    pipeline_id: payload.pipeline_id,
    stage_id: stage.id,
    created_by: fullLead.createdBy,

    assigned_users_count: fullLead.assignments.length,
  };
}

export async function updateLeadStage(lead_id, payload, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  Fetch Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: {
      id: true,
      stage_id: true,
      pipeline_id: true,
      company_profile_id: true,
      source: true,
      stage_updated_at: true,
    },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  const assignments = await prisma.leadAssignment.findMany({
    where: { lead_id },
    select: {
      admin_user_id: true,
      role: true,
    },
  });

  const assignment = assignments.find((a) => a.admin_user_id === adminUserId);

  if (!assignment) {
    throw new ForbiddenError("You are not assigned to this lead");
  }

  const owner = assignments.find((a) => a.role === "OWNER");

  /* ----------------------------------------
  Fetch Old Stage
  ---------------------------------------- */

  const oldStage = await prisma.leadPipelineStage.findFirst({
    where: { id: lead.stage_id },
    select: {
      id: true,
      name: true,
      is_closed: true,
      is_won: true,
    },
  });

  if (!oldStage) {
    throw new ValidationError("Current stage not found");
  }
  /* ----------------------------------------
  Fetch New Stage
  ---------------------------------------- */

  const stage = await prisma.leadPipelineStage.findFirst({
    where: {
      id: payload.stage_id,
    },
    select: {
      id: true,
      name: true,
      pipeline_id: true,
      is_closed: true,
      is_won: true,
    },
  });

  if (!stage) {
    throw new ValidationError("Invalid stage");
  }

  if (stage.pipeline_id !== lead.pipeline_id) {
    throw new ValidationError("Stage does not belong to this pipeline");
  }

  if (lead.stage_id === stage.id) {
    throw new ValidationError("Lead already in this stage");
  }

  /* ----------------------------------------
  Block WON / LOST if activity active
  ---------------------------------------- */

  if (stage.is_closed) {
    const activeActivity = await prisma.leadActivity.findFirst({
      where: {
        lead_id,
        status: "ACTIVE",
        deleted_at: null,
      },
      select: { id: true },
    });

    if (activeActivity) {
      throw new ValidationError(
        "Active activity exists. Complete or mark it missed before closing the lead.",
      );
    }
  }

  if (stage.is_closed && !stage.is_won && !payload.lost_reason) {
    throw new ValidationError("Lost reason is required");
  }

  /* ----------------------------------------
  Compute State Transitions
  ---------------------------------------- */

  const isClosing = !oldStage.is_closed && stage.is_closed;
  const isReopening = oldStage.is_closed && !stage.is_closed;
  const isSwitchingClosure =
    oldStage.is_closed && stage.is_closed && oldStage.is_won !== stage.is_won;

  /* ----------------------------------------
  Transaction
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    const updatedLead = await tx.lead.update({
      where: { id: lead_id },
      data: {
        stage_id: stage.id,
        stage_updated_at: now,
        stage_updated_by: adminUserId,
        updated_by: adminUserId,

        won_by_id: stage.is_closed && stage.is_won ? adminUserId : null,

        lost_by_id: stage.is_closed && !stage.is_won ? adminUserId : null,

        closure_status: isClosing
          ? stage.is_won
            ? "WON"
            : "LOST"
          : isReopening
            ? null
            : isSwitchingClosure
              ? stage.is_won
                ? "WON"
                : "LOST"
              : undefined,
      },
      select: {
        id: true,
        stage_id: true,
        stage_updated_at: true,
      },
    });

    await tx.leadStageHistory.create({
      data: {
        lead_id,
        from_stage_id: lead.stage_id,
        to_stage_id: stage.id,
        changed_by: adminUserId,
        note: payload.lost_reason,
      },
    });

    /* ----------------------------------------
    Analytics (single entry point)
    ---------------------------------------- */

    await handleLeadStageChange(tx, {
      lead: {
        id: lead.id,
        pipeline_id: lead.pipeline_id,
        company_profile_id: lead.company_profile_id,
        source: lead.source?.source ?? "MANUAL",
        stage_updated_at: lead.stage_updated_at,
      },
      oldStage,
      newStage: stage,
      ownerId: owner?.admin_user_id || null,
      closedBy: adminUserId,
    });

    return {
      lead_id: updatedLead.id,

      from_stage_id: lead.stage_id,
      to_stage_id: stage.id,

      stage: {
        id: stage.id,
        name: stage.name,
        is_closed: stage.is_closed,
        is_won: stage.is_won,
      },

      closure_status: stage.is_closed ? (stage.is_won ? "WON" : "LOST") : null,

      is_won: stage.is_closed && stage.is_won,
      is_lost: stage.is_closed && !stage.is_won,
      note: payload.lost_reason ?? null,

      stage_updated_at: updatedLead.stage_updated_at,
    };
  });

  const changes = [];

  /* Stage Change */
  changes.push({
    field: "stage",
    from: {
      id: oldStage.id,
      name: oldStage.name,
    },
    to: {
      id: stage.id,
      name: stage.name,
    },
  });

  /* Closure Status Change */
  if (isClosing || isReopening || isSwitchingClosure) {
    changes.push({
      field: "closure_status",
      from: oldStage.is_closed ? (oldStage.is_won ? "WON" : "LOST") : null,
      to: stage.is_closed ? (stage.is_won ? "WON" : "LOST") : null,
    });
  }

  await addLeadActivityLog(lead_id, adminUserId, {
    action: "LEAD_STAGE_CHANGED",
    message: buildActivityMessage(changes),
    meta: { changes },
  });

  return result;
}

export async function listPipelineLeads(pipeline_id, query, admin_user) {
  const limit = 6;
  const adminUserId = admin_user.id;
  const includeMeta = query.include_meta === true;

  let parsedCursor = {};
  if (query.cursor) {
    try {
      parsedCursor = JSON.parse(
        Buffer.from(query.cursor, "base64").toString("utf-8"),
      );
    } catch {}
  }

  /* ----------------------------------------
  Validate Pipeline
  ---------------------------------------- */

  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      id: pipeline_id,

      deleted_at: null,
    },
    select: { id: true },
  });

  if (!pipeline) {
    throw new NotFoundError("Pipeline not found");
  }

  /* ----------------------------------------
  Fetch Stages
  ---------------------------------------- */

  const stageWhere = {
    pipeline_id,
    ...(query.stage_ids && {
      id: { in: query.stage_ids },
    }),
  };

  const stages = await prisma.leadPipelineStage.findMany({
    where: stageWhere,
    orderBy: { stage_order: "asc" },
    select: {
      id: true,
      name: true,
      is_closed: true,
      is_won: true,
    },
  });

  /* ----------------------------------------
  Visibility Filter
  ---------------------------------------- */

  const visibilityFilter =
    admin_user.admin_role === "SUPER_ADMIN"
      ? {}
      : {
          assignments: {
            some: {
              admin_user_id: adminUserId,
            },
          },
        };

  /* ----------------------------------------
  Fetch Leads Per Stage
  ---------------------------------------- */

  const stageResults = await Promise.all(
    stages.map(async (stage) => {
      const cursorData = parsedCursor[stage.id];

      let cursorClause = {};

      if (cursorData) {
        cursorClause = {
          OR: [
            {
              created_at: {
                lt: new Date(cursorData.cursor_created_at),
              },
            },
            {
              created_at: new Date(cursorData.cursor_created_at),
              id: {
                lt: cursorData.cursor_id,
              },
            },
          ],
        };
      }

      const rows = await prisma.lead.findMany({
        where: {
          pipeline_id,
          stage_id: stage.id,
          deleted_at: null,
          ...visibilityFilter,
          ...cursorClause,
        },

        orderBy: [{ created_at: "desc" }, { id: "desc" }],

        take: limit + 1,

        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          expected_close_date: true,

          created_at: true,
          updated_at: true,

          ai_summary: true,
          ai_summary_generated_at: true,

          stage_updated_at: true,

          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },

          ...(includeMeta && {
            _count: {
              select: {
                assignments: true,
                activities: {
                  where: { status: "ACTIVE" },
                },
              },
            },

            activities: {
              take: 1,
              orderBy: { created_at: "desc" },
              select: {
                activity_type: true,
                status: true,
                scheduled_at: true,
                completed_at: true,
                created_at: true,
              },
            },
          }),
        },
      });

      let next_cursor = null;

      if (rows.length > limit) {
        rows.pop();

        const lastItem = rows[rows.length - 1];

        next_cursor = {
          cursor_id: lastItem.id,
          cursor_created_at: lastItem.created_at,
        };
      }

      return {
        stage: {
          id: stage.id,
          name: stage.name,
          is_closed: stage.is_closed,
          is_won: stage.is_won,
        },

        items: rows.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          priority: l.priority,
          expected_close_date: l.expected_close_date,

          created_at: l.created_at,
          updated_at: l.updated_at,

          ai_summary: l.ai_summary,
          ai_summary_generated_at: l.ai_summary_generated_at,

          stage_updated_at: l.stage_updated_at,

          created_by: {
            id: l.createdBy?.id,
            name: l.createdBy?.name,
          },

          ...(includeMeta && {
            active_activities_count: l._count.activities,
            assigned_users_count: l._count.assignments,
            latest_activity: l.activities[0] || null,
          }),
        })),

        next_cursor,
        has_more: Boolean(next_cursor),
      };
    }),
  );

  /* ----------------------------------------
  Build Global Cursor
  ---------------------------------------- */

  const nextCursorPayload = {};

  for (const s of stageResults) {
    if (s.next_cursor) {
      nextCursorPayload[s.stage.id] = s.next_cursor;
    }
  }

  const next_cursor =
    Object.keys(nextCursorPayload).length > 0
      ? Buffer.from(JSON.stringify(nextCursorPayload)).toString("base64")
      : null;

  return {
    stages: stageResults,
    next_cursor,
  };
}

export async function deleteLead(lead_id, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  Fetch Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: { id: lead_id, deleted_at: null },
    select: { id: true, created_by: true, lead_contact_id: true },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  /* ----------------------------------------
  Block if ACTIVE activity exists
  ---------------------------------------- */

  const activeActivity = await prisma.leadActivity.findFirst({
    where: {
      lead_id,
      status: "ACTIVE",
      deleted_at: null,
    },
    select: { id: true },
  });

  if (activeActivity) {
    throw new ValidationError(
      "Lead has an active activity. Complete or mark it missed before deleting the lead.",
    );
  }

  /* ----------------------------------------
  Permission Check
  ---------------------------------------- */

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id,
        admin_user_id: adminUserId,
        role: "OWNER",
      },
      select: { id: true },
    });

    if (!assignment || lead.created_by !== adminUserId) {
      throw new ForbiddenError(
        "Only the lead creator who is also the owner can delete this lead",
      );
    }
  }

  /* ----------------------------------------
  Transaction: Delete Lead + Handle Contact
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    // 1. Soft delete lead
    const deletedLead = await tx.lead.update({
      where: { id: lead_id },
      data: {
        deleted_at: now,
        deleted_by: adminUserId,
      },
      select: {
        id: true,
        deleted_at: true,
        lead_contact_id: true,
      },
    });

    // 2. Check if contact is used by other ACTIVE leads
    if (deletedLead.lead_contact_id) {
      const otherLeadsUsingContact = await tx.lead.count({
        where: {
          lead_contact_id: deletedLead.lead_contact_id,
          deleted_at: null,
          NOT: {
            id: lead_id,
          },
        },
      });

      // 3. If unused → soft delete contact
      if (otherLeadsUsingContact === 0) {
        await tx.leadContact.update({
          where: { id: deletedLead.lead_contact_id },
          data: {
            deleted_at: now,
            deleted_by: adminUserId,
          },
        });
      }
    }

    return deletedLead;
  });

  /* ----------------------------------------
  CHANGE-LOG
  ---------------------------------------- */

  await addLeadActivityLog(lead_id, adminUserId, {
    action: "LEAD_DELETED",
    message: "Lead deleted",
    meta: {
      deleted_by: adminUserId,
      deleted_at: now,
    },
  });

  return result;
}

export async function updateLead(lead_id, payload, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  Validate Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: { id: lead_id, deleted_at: null },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      expected_close_date: true,
      company_profile_id: true,
      tags: { select: { tag_id: true } },
      lead_contact_id: true,
      reference: {
        select: {
          id: true,
          type: true,
          name: true,
          influencer_id: true,
          entity_id: true,
          lead_contact_id: true,
        },
      },
    },
  });

  if (!lead) throw new NotFoundError("Lead not found");

  const originalLead = structuredClone(lead);

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: { lead_id, admin_user_id: adminUserId },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  /* ----------------------------------------
  Detect Update Type (STRICT CONTRACT)
  ---------------------------------------- */

  const isCoreUpdate =
    payload.title !== undefined ||
    payload.description !== undefined ||
    payload.priority !== undefined ||
    payload.expected_close_date !== undefined ||
    payload.company_profile_id !== undefined;

  const isTagsUpdate = payload.tags !== undefined;
  const isReferenceUpdate = payload.reference !== undefined;
  const isContactUpdate = payload.lead_contact_id !== undefined;

  const updateTypes = [
    isCoreUpdate,
    isTagsUpdate,
    isReferenceUpdate,
    isContactUpdate,
  ].filter(Boolean);

  if (updateTypes.length !== 1) {
    throw new ValidationError("Only one update type allowed at a time");
  }

  /* ----------------------------------------
  Validate Company
  ---------------------------------------- */

  if (
    payload.company_profile_id !== undefined &&
    payload.company_profile_id !== null
  ) {
    const company = await prisma.companyProfile.findFirst({
      where: { id: payload.company_profile_id, is_active: true },
      select: { id: true },
    });

    if (!company) throw new ValidationError("Invalid company profile");
  }

  /* ----------------------------------------
  Validate Contact
  ---------------------------------------- */

  if (
    payload.lead_contact_id !== undefined &&
    payload.lead_contact_id !== null
  ) {
    let contact = await prisma.leadContact.findFirst({
      where: { id: payload.lead_contact_id },
      select: { id: true },
    });

    if (!contact) throw new ValidationError("Invalid lead contact");
    if (contact.deleted_at !== null) {
      contact = await prisma.leadContact.update({
        where: { id: contact.id },
        data: {
          deleted_at: null,
          updated_by: adminUserId,
        },
      });
    }
  }

  /* ----------------------------------------
  Validate Tags
  ---------------------------------------- */

  let validTagIds = [];

  if (isTagsUpdate) {
    const uniqueIds = [...new Set(payload.tags)];

    const tags = await prisma.leadTag.findMany({
      where: { id: { in: uniqueIds }, deleted_at: null },
      select: { id: true },
    });

    if (tags.length !== uniqueIds.length) {
      throw new ValidationError("One or more tags are invalid");
    }

    validTagIds = tags.map((t) => t.id);
  }

  /* ----------------------------------------
  Validate Reference
  ---------------------------------------- */

  const ref = payload.reference;

  if (ref) {
    if (ref.type === "INFLUENCER") {
      const influencer = await prisma.influencer.findFirst({
        where: { id: ref.influencer_id, deleted_at: null },
      });
      if (!influencer) throw new ValidationError("Invalid influencer");
    }

    if (ref.type === "ENTITY") {
      const entity = await prisma.entity.findUnique({
        where: { id: ref.entity_id },
      });
      if (!entity) throw new ValidationError("Invalid entity");
    }

    if (ref.type === "LEAD_CONTACT") {
      const contact = await prisma.leadContact.findFirst({
        where: { id: ref.lead_contact_id, deleted_at: null },
      });
      if (!contact) throw new ValidationError("Invalid contact ref");
    }
  }

  /* ----------------------------------------
  Prepare Update Data
  ---------------------------------------- */

  const updateData = {
    updated_by: adminUserId,
    updated_at: now,
  };

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.description !== undefined)
    updateData.description = payload.description;
  if (payload.priority !== undefined) updateData.priority = payload.priority;

  if (payload.expected_close_date !== undefined) {
    updateData.expected_close_date = payload.expected_close_date
      ? new Date(payload.expected_close_date)
      : null;
  }

  if (payload.company_profile_id !== undefined) {
    updateData.company_profile_id = payload.company_profile_id;
  }

  if (payload.lead_contact_id !== undefined) {
    updateData.lead_contact_id = payload.lead_contact_id;
  }

  /* ----------------------------------------
  Transaction
  ---------------------------------------- */

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: lead_id },
      data: updateData,
    });

    if (isTagsUpdate) {
      const existing = await tx.leadTagMap.findMany({
        where: { lead_id },
        select: { tag_id: true },
      });

      const existingIds = existing.map((t) => t.tag_id);

      const toAdd = validTagIds.filter((id) => !existingIds.includes(id));
      const toRemove = existingIds.filter((id) => !validTagIds.includes(id));

      if (toRemove.length) {
        await tx.leadTagMap.deleteMany({
          where: { lead_id, tag_id: { in: toRemove } },
        });
      }

      if (toAdd.length) {
        await tx.leadTagMap.createMany({
          data: toAdd.map((tag_id) => ({ lead_id, tag_id })),
        });
      }
    }

    if (payload.reference === null) {
      await tx.leadReference.deleteMany({ where: { lead_id } });
    }

    if (ref) {
      await tx.leadReference.deleteMany({ where: { lead_id } });

      await tx.leadReference.create({
        data: {
          lead_id,
          type: ref.type,
          influencer_id: ref.influencer_id,
          entity_id: ref.entity_id,
          lead_contact_id: ref.lead_contact_id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email,
        },
      });
    }
  });

  /* ----------------------------------------
CHANGE LOG
---------------------------------------- */

  const from = {};
  const to = {};

  if (payload.title !== undefined && payload.title !== originalLead.title) {
    from.title = originalLead.title;
    to.title = payload.title;
  }

  if (
    payload.description !== undefined &&
    payload.description !== originalLead.description
  ) {
    from.description = originalLead.description ?? null;
    to.description = payload.description;
  }

  if (
    payload.priority !== undefined &&
    payload.priority !== originalLead.priority
  ) {
    from.priority = originalLead.priority;
    to.priority = payload.priority;
  }

  if (isTagsUpdate) {
    const oldTags = originalLead.tags
      .map((t) => t.tag_id)
      .sort()
      .join(",");
    const newTags = validTagIds.sort().join(",");
    if (oldTags !== newTags) {
      from.tags = oldTags || null;
      to.tags = newTags || null;
    }
  }

  if (payload.reference !== undefined) {
    from.reference = originalLead.reference;
    to.reference = payload.reference;
  }

  if (Object.keys(from).length > 0) {
    const changes = [{ action: "LEAD_UPDATED", from, to }];

    await addLeadActivityLog(lead_id, adminUserId, {
      action: "LEAD_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    });
  }
  /* ----------------------------------------
  RESPONSE (OPTIMIZED)
  ---------------------------------------- */

  const response = { id: lead_id };

  if (isCoreUpdate) {
    const updated = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: {
        title: true,
        description: true,
        priority: true,
        expected_close_date: true,
        updated_at: true,
      },
    });

    Object.assign(response, updated);
  }

  if (isTagsUpdate) {
    const tags = await prisma.leadTagMap.findMany({
      where: { lead_id },
      include: {
        tag: { select: { id: true, name: true, color: true } },
      },
    });

    response.tags = tags.map((t) => t.tag);
  }

  if (isReferenceUpdate) {
    const reference = await prisma.leadReference.findFirst({
      where: { lead_id },
      include: {
        influencer: {
          select: { name: true, phone: true, email: true },
        },
        entity: {
          select: { name: true, primary_phone: true, email: true },
        },
        leadContact: {
          select: {
            contact_person: true,
            primary_phone: true,
            primary_email: true,
          },
        },
      },
    });

    response.reference = reference
      ? reference.influencer
        ? {
            type: "INFLUENCER",
            name: reference.influencer.name ?? null,
            phone: reference.influencer.phone ?? null,
            email: reference.influencer.email ?? null,
          }
        : reference.entity
          ? {
              type: "ENTITY",
              name: reference.entity.name ?? null,
              phone: reference.entity.primary_phone ?? null,
              email: reference.entity.email ?? null,
            }
          : reference.leadContact
            ? {
                type: "LEAD_CONTACT",
                name: reference.leadContact.contact_person ?? null,
                phone: reference.leadContact.primary_phone ?? null,
                email: reference.leadContact.primary_email ?? null,
              }
            : {
                type: "EXTERNAL_PERSON",
                name: reference.name ?? null,
                phone: reference.phone ?? null,
                email: reference.email ?? null,
              }
      : null;
  }

  if (isContactUpdate) {
    const contact = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: {
        contact: {
          include: {
            creator: { select: { id: true, name: true } },
          },
        },
      },
    });

    response.contact = contact.contact;
  }

  return response;
}

export async function getLeadStageTimeline(lead_id, query, admin_user) {
  const limit = query.limit || 20;

  /* ----------------------------------------
  Validate Access
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
      ...(admin_user.admin_role !== "SUPER_ADMIN" && {
        assignments: {
          some: { admin_user_id: admin_user.id },
        },
      }),
    },
    select: { id: true },
  });

  if (!lead) throw new NotFoundError("Lead not found or access denied");

  /* ----------------------------------------
  Cursor
  ---------------------------------------- */

  let cursorClause = {};

  if (query.cursor) {
    try {
      const { cursor_id, cursor_changed_at } = JSON.parse(
        Buffer.from(query.cursor, "base64").toString("utf-8"),
      );

      cursorClause = {
        OR: [
          { changed_at: { lt: new Date(cursor_changed_at) } },
          {
            changed_at: new Date(cursor_changed_at),
            id: { lt: cursor_id },
          },
        ],
      };
    } catch {}
  }

  /* ----------------------------------------
  Fetch Stage History
  ---------------------------------------- */

  const rows = await prisma.leadStageHistory.findMany({
    where: {
      lead_id,
      ...cursorClause,
    },
    orderBy: [{ changed_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      changed_at: true,
      note: true,
      changer: {
        select: { id: true, name: true },
      },
      from_stage: {
        select: { id: true, name: true, is_won: true, is_closed: true },
      },
      to_stage: {
        select: { id: true, name: true, is_won: true, is_closed: true },
      },
    },
  });

  /* ----------------------------------------
  Pagination
  ---------------------------------------- */

  let next_cursor = null;

  if (rows.length > limit) {
    const nextItem = rows.pop();
    next_cursor = Buffer.from(
      JSON.stringify({
        cursor_id: nextItem.id,
        cursor_changed_at: nextItem.changed_at,
      }),
    ).toString("base64");
  }

  /* ----------------------------------------
  Shape Response
  ---------------------------------------- */

  const items = rows.map((row) => ({
    id: row.id,
    changed_at: row.changed_at,
    note: row.note ?? null,
    changed_by: {
      id: row.changer.id,
      name: row.changer.name,
    },
    from_stage: row.from_stage
      ? {
          id: row.from_stage.id,
          name: row.from_stage.name,
          is_won: row.from_stage.is_won,
          is_closed: row.from_stage.is_closed,
        }
      : null, // null = lead was just created, no previous stage
    to_stage: {
      id: row.to_stage.id,
      name: row.to_stage.name,
      is_won: row.to_stage.is_won,
      is_closed: row.to_stage.is_closed,
    },
  }));

  return { items, next_cursor };
}

// Lead Pipeline Generator
export function buildLeadPipelineTimeline(lead, currentStageHistory) {
  const now = new Date();

  const pipeline_stages = lead.pipeline.stages.map((stage) => ({
    stage_id: stage.id,
    name: stage.name,
    order: stage.stage_order,
    is_current: lead.stage_id === stage.id,
    is_closed: stage.is_closed,
    is_won: stage.is_won,
  }));

  let total_duration_ms = 0;
  for (let i = 0; i < currentStageHistory.length; i++) {
    const enteredAt = new Date(currentStageHistory[i].changed_at);
    const exitedAt = currentStageHistory[i + 1]
      ? new Date(currentStageHistory[i + 1].changed_at)
      : now;
    total_duration_ms += exitedAt - enteredAt;
  }

  const latestNote = currentStageHistory.at(-1)?.note ?? null;

  return {
    pipeline_stages,
    summary: {
      current_stage: lead.stage,
      time_in_current_stage_ms: lead.stage_updated_at
        ? now - new Date(lead.stage_updated_at)
        : null,
      current_stage_metrics: {
        entries: currentStageHistory.length,
        total_duration_ms,
        last_entered_at: currentStageHistory.at(-1)?.changed_at ?? null,
      },

      lost_reason:
        lead.stage?.is_closed && !lead.stage?.is_won ? latestNote : null,
    },
  };
}
function formatLabel(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function normalizeLeadSource(source) {
  if (!source) return [];

  const items = [];

  // Basic fields
  if (source.source) {
    items.push({ label: "Source", value: source.source });
  }

  if (source.external_id) {
    items.push({ label: "External ID", value: source.external_id });
  }

  items.push({
    label: "System Generated",
    value: source.source == "MANUAL" ? "Yes" : "No",
  });

  if (source.created_at) {
    items.push({
      label: "Created At",
      value: new Date(source.created_at).toLocaleString(),
    });
  }

  if (source.raw_payload && typeof source.raw_payload === "object") {
    Object.entries(source.raw_payload).forEach(([key, val]) => {
      // expected shape: { value, is_link }
      if (val && typeof val === "object") {
        items.push({
          label: formatLabel(key),
          value: val.value ?? "-",
          is_link: !!val.is_link,
          full: true,
        });
      } else {
        // fallback (plain value)
        items.push({
          label: formatLabel(key),
          value: val ?? "-",
        });
      }
    });
  }

  return items;
}

export async function getLeadDetails(lead_id, admin_user) {
  const adminUserId = admin_user.id;

  /* ----------------------------------------
    Assignment Check
    ---------------------------------------- */

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id,
        admin_user_id: adminUserId,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  /* ----------------------------------------
    Fetch Lead
    ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    include: {
      winner: {
        select: {
          id: true,
          name: true,
        },
      },
      loser: {
        select: {
          id: true,
          name: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      contact: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      company_profile: {
        select: {
          id: true,
          name: true,
        },
      },
      assignments: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },

      pipeline: {
        select: {
          id: true,
          name: true,
          stages: {
            where: { deleted_at: null },
            orderBy: { stage_order: "asc" },
            select: {
              id: true,
              name: true,
              stage_order: true,
              is_closed: true,
              is_won: true,
            },
          },
        },
      },

      stage: {
        select: {
          id: true,
          name: true,
          is_closed: true,
          is_won: true,
        },
      },

      reference: {
        select: {
          type: true,
          name: true,
          phone: true,
          email: true,
          influencer: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
          entity: {
            select: {
              name: true,
              primary_phone: true,
              email: true,
            },
          },
          leadContact: {
            select: {
              contact_person: true,
              primary_phone: true,
              primary_email: true,
            },
          },
        },
      },
      source: {
        select: {
          source: true,
          external_id: true,
          is_system: true,
          created_at: true,
          raw_payload: true,
        },
      },

      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  /* ----------------------------------------
    Fetch Current Stage History + Activities
    (parallel — neither depends on the other)
    ---------------------------------------- */

  const [currentStageHistory, activities] = await Promise.all([
    prisma.leadStageHistory.findMany({
      where: {
        lead_id,
        to_stage_id: lead.stage_id,
      },
      orderBy: { changed_at: "asc" },
      select: {
        changed_at: true,
        note: true,
        changer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.leadActivity.findMany({
      where: {
        lead_id,
        deleted_at: null,
        status: "ACTIVE",
        lead: {
          deleted_at: null,
        },
      },
      orderBy: [{ scheduled_at: "asc" }, { created_at: "desc" }],
      take: 10,
      select: {
        id: true,
        activity_type: true,
        status: true,
        title: true,
        description: true,
        is_scheduled: true,
        scheduled_at: true,
        created_at: true,
        updated_at: true,
        completed_at: true,
        completion_note: true,
        missed_reason: true,
        missed_by: true,
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
          },
        },
        closer: {
          select: {
            id: true,
            name: true,
          },
        },
        email_message: {
          select: {
            id: true,
            sent_at: true,
            last_error: true,
          },
        },
        video_call_meta: {
          select: {
            status: true,
            provider: true,
            meeting_link: true,
            host_start_link: true,
            scheduled_at: true,

            started_at: true,
            ended_at: true,

            is_transcript_ready: true,
            has_transcript: true,

            provider_meeting_id: true,
            meeting_code: true,

            host_user_id: true,
            host_email: true,

            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
  ]);

  const now = new Date();

  const activityItems = activities.map((a) => ({
    id: a.id,
    type: a.activity_type,
    status: a.status,
    is_completed: a.status === "COMPLETED",
    is_overdue:
      a.status === "ACTIVE" && a.scheduled_at && new Date(a.scheduled_at) < now,
    is_missed: a.status === "MISSED",
    title: a.title,
    description: a.description,
    is_scheduled: a.is_scheduled,
    scheduled_at: a.scheduled_at,
    created_at: a.created_at,
    updated_at: a.updated_at,
    completed_at: a.completed_at,
    completion_note: a.completion_note,
    missed_reason: a.missed_reason,
    missed_by: a.missed_by,
    created_by: a.creator,
    updated_by: a.updater,
    closed_by: a.closer,
    email: a.email_message
      ? {
          linked: true,
          sent: !!a.email_message.sent_at,
          last_error: a.email_message.last_error ?? null,
        }
      : null,
    video_call: a.video_call_meta
      ? {
          linked: true,
          status: a.video_call_meta.status,

          provider: a.video_call_meta.provider ?? null,
          meeting_link: a.video_call_meta.meeting_link ?? null,
          host_start_link: a.video_call_meta.host_start_link ?? null,

          scheduled_at: a.video_call_meta.scheduled_at ?? null,
          started_at: a.video_call_meta.started_at ?? null,
          ended_at: a.video_call_meta.ended_at ?? null,

          meeting_started: !!a.video_call_meta.started_at,
          meeting_ended: !!a.video_call_meta.ended_at,
          link_generated: !!a.video_call_meta.meeting_link,

          transcript_available: !!a.video_call_meta.is_transcript_ready,
          transcript_recorded: !!a.video_call_meta.has_transcript,

          provider_meeting_id: a.video_call_meta.provider_meeting_id ?? null,
          meeting_code: a.video_call_meta.meeting_code ?? null,

          host_user_id: a.video_call_meta.host_user_id ?? null,
          host_email: a.video_call_meta.host_email ?? null,

          created_at: a.video_call_meta.created_at,
          updated_at: a.video_call_meta.updated_at,
        }
      : null,
  }));

  const TIMELINE = buildLeadPipelineTimeline(lead, currentStageHistory);

  // GET first 3 pinned commetns
  const pinned_comments = await listPinnedLeadComments(lead.id, admin_user);

  /* ----------------------------------------
    Response
    ---------------------------------------- */

  return {
    id: lead.id,
    title: lead.title,
    description: lead.description,
    priority: lead.priority,
    expected_close_date: lead.expected_close_date,
    timeline: TIMELINE,
    created_by: lead.createdBy,
    updated_by: lead.updatedBy,
    created_at: lead.created_at,
    assignments: lead?.assignments?.map((a) => a.assignee) || [],
    is_won: lead.closure_status === "WON",
    is_lost: lead.closure_status === "LOST",
    won_by: lead.winner,
    lost_by: lead.loser,
    closure_status: lead.closure_status,
    updated_at: lead.updated_at,
    pipeline: {
      pipline_id: lead.pipeline.id,
      name: lead.pipeline.name,
    },
    contact: lead.contact,
    ai_summary: lead.ai_summary ?? null,
    ai_summary_generated_at: lead.ai_summary_generated_at ?? null,
    company_profile: lead.company_profile,
    pinned_comments: pinned_comments,
    source: normalizeLeadSource(lead.source),
    reference: lead.reference
      ? lead.reference.influencer
        ? {
            type: "INFLUENCER",
            name: lead.reference.influencer.name ?? null,
            phone: lead.reference.influencer.phone ?? null,
            email: lead.reference.influencer.email ?? null,
          }
        : lead.reference.entity
          ? {
              type: "ENTITY",
              name: lead.reference.entity.name ?? null,
              phone: lead.reference.entity.primary_phone ?? null,
              email: lead.reference.entity.email ?? null,
            }
          : lead.reference.leadContact
            ? {
                type: "LEAD_CONTACT",
                name: lead.reference.leadContact.contact_person ?? null,
                phone: lead.reference.leadContact.primary_phone ?? null,
                email: lead.reference.leadContact.primary_email ?? null,
              }
            : {
                type: "EXTERNAL_PERSON",
                name: lead.reference.name ?? null,
                phone: lead.reference.phone ?? null,
                email: lead.reference.email ?? null,
              }
      : null,
    tags: lead.tags.map((t) => t.tag),
    focus_now: activityItems,
  };
}

export const searchLeads = async (filters = {}, currentUser) => {
  const {
    search,
    pipeline_id,
    stage_id,
    tags,
    created_by,
    priority,
    company_profile_id,
    user_id,
    page = 1,
    page_size = 10,
  } = filters;

  // ─────────────────────────────────────────────
  // Validate search
  // ─────────────────────────────────────────────
  const cleanedTokens = search
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
    .filter(Boolean);

  if (cleanedTokens.length === 0) {
    throw new ValidationError("Search contains no valid characters");
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = Math.min(50, Math.max(1, parseInt(page_size, 10) || 10));
  const offset = (safePage - 1) * safePageSize;

  // ─────────────────────────────────────────────
  // Visibility (IMPORTANT)
  // ─────────────────────────────────────────────
  const visibilityClause =
    currentUser.admin_role === "SUPER_ADMIN"
      ? Prisma.sql`TRUE`
      : Prisma.sql`
        EXISTS (
          SELECT 1 FROM "LeadAssignment" la
          WHERE la.lead_id = l.id
            AND la.admin_user_id = ${currentUser.id}::uuid
        )
      `;

  // Admin filter override
  const userFilterClause =
    currentUser.admin_role === "SUPER_ADMIN" && user_id
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1 FROM "LeadAssignment" la2
          WHERE la2.lead_id = l.id
            AND la2.admin_user_id = ${user_id}::uuid
        )
      `
      : Prisma.empty;

  // Tags filter
  const tagsClause =
    tags && tags.length > 0
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1 FROM "LeadTagMap" ltm
          WHERE ltm.lead_id = l.id
            AND ltm.tag_id = ANY(${tags}::uuid[])
        )
      `
      : Prisma.empty;

  // ─────────────────────────────────────────────
  // Query
  // ─────────────────────────────────────────────
  const rows = await prisma.$queryRaw`
    WITH search_query AS (
      SELECT to_tsquery(
        'simple',
        array_to_string(
          ARRAY(
            SELECT
              CASE
                WHEN length(w) >= 4 THEN w || ':*'
                ELSE w
              END
            FROM unnest(${cleanedTokens}::text[]) AS w
          ),
          ' & '
        )
      ) AS query
    )

    SELECT
      l.id,
      l.title,
      l.description,
      l.priority,
      l.created_at,
      l.pipeline_id,
      l.stage_id,
      ts_rank(l.search_vector, search_query.query) AS rank

    FROM "Lead" l
    CROSS JOIN search_query

    WHERE
      l.deleted_at IS NULL
      AND l.pipeline_id = ${pipeline_id}::uuid
      AND l.stage_id = ${stage_id}::uuid

      AND ${visibilityClause}
      ${userFilterClause}

      ${created_by ? Prisma.sql`AND l.created_by = ${created_by}::uuid` : Prisma.empty}
      ${priority ? Prisma.sql`AND l.priority = ${priority}::"LeadPriority"` : Prisma.empty}
      ${company_profile_id ? Prisma.sql`AND l.company_profile_id = ${company_profile_id}::uuid` : Prisma.empty}

      ${tagsClause}

      AND l.search_vector @@ search_query.query

    ORDER BY
      rank DESC,
      l.created_at DESC

    LIMIT ${safePageSize}
    OFFSET ${offset};
  `;

  return {
    page: safePage,
    page_size: safePageSize,
    results: rows,
  };
};

// init hanlder webiste lead ads or no ads
export async function handleExternalLeadInit(body) {
  const {
    identity,
    service,
    leadHash,
    payload,
    ip_address,
    isFinalStep,
    company_profile_id,
  } = body;

  const email = identity.email.toLowerCase().trim();
  const phone = identity.phone.replace(/\D/g, "");

  /* ---------------------------------------------------
  STEP 1: FIND EXISTING LEAD BY SOURCE external_id
  --------------------------------------------------- */
  // lead_hash is not on Lead model — query via LeadSourceData
  const existingSourceData = await prisma.leadSourceData.findFirst({
    where: {
      external_id: leadHash,
    },
    include: {
      lead: {
        include: {
          stage: {
            select: { is_closed: true },
          },
        },
      },
    },
  });

  const existingLead = existingSourceData?.lead ?? null;

  /* ---------------------------------------------------
  CASE 1: OPEN LEAD EXISTS → DO NOTHING
  --------------------------------------------------- */
  if (
    existingLead &&
    existingLead.deleted_at === null &&
    existingLead.stage &&
    !existingLead.stage.is_closed
  ) {
    return {
      status: "IGNORED_DUPLICATE_OPEN",
      lead_id: existingLead.id,
    };
  }

  /* ---------------------------------------------------
  STEP 2: FIND OR CREATE CONTACT
  --------------------------------------------------- */
  let contact = await prisma.leadContact.findFirst({
    where: {
      OR: [{ primary_email: email }, { primary_phone: phone }],
    },
  });

  if (contact && contact.deleted_at !== null) {
    contact = await prisma.leadContact.update({
      where: { id: contact.id },
      data: {
        deleted_at: null,
        updated_by: SYSTEM_USER_ID,
      },
    });
  }

  if (!contact) {
    contact = await prisma.leadContact.create({
      data: {
        entity_type: "INDIVIDUAL",
        contact_person: identity.name,
        primary_email: email,
        primary_phone: phone,
        created_by: SYSTEM_USER_ID,
      },
    });
  }

  /* ---------------------------------------------------
  STEP 3: GET DEFAULT PIPELINE + FIRST OPEN STAGE
  --------------------------------------------------- */
  const pipeline = await prisma.leadPipeline.findFirst({
    where: {
      is_default: true,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!pipeline) throw new Error("No default pipeline configured");

  const stage = await prisma.leadPipelineStage.findFirst({
    where: {
      pipeline_id: pipeline.id,
      is_closed: false,
      deleted_at: null,
    },
    orderBy: { stage_order: "asc" },
    select: { id: true },
  });

  if (!stage) throw new Error("Default pipeline has no open stages");

  /* ---------------------------------------------------
  STEP 4: GET COMPANY PROFILE
  --------------------------------------------------- */
  let company = null;

  if (company_profile_id) {
    company = await prisma.companyProfile.findFirst({
      where: { id: company_profile_id, is_active: true },
      select: { id: true },
    });
  }

  if (!company) {
    company = await prisma.companyProfile.findFirst({
      where: { is_active: true },
      orderBy: { created_at: "asc" },
      select: { id: true },
    });
  }

  if (!company) throw new Error("No active company profile found");

  /* ---------------------------------------------------
  STEP 5: ENSURE TAG EXISTS
  --------------------------------------------------- */
  const TAG_NAME = "AFIN_ADVISORY_LEAD";

  let tag = await prisma.leadTag.findFirst({
    where: { normalized_name: TAG_NAME },
  });

  if (!tag) {
    tag = await prisma.leadTag.create({
      data: {
        name: TAG_NAME,
        normalized_name: TAG_NAME,
        color: REMINDER_TAG_COLORS["RED"],
        created_by: SYSTEM_USER_ID,
      },
    });
  }

  /* ---------------------------------------------------
  STEPS 6–9: CREATE LEAD + TAG + SOURCE + ASSIGNMENT
  all in one transaction
  --------------------------------------------------- */
  const now = new Date();
  let expectedCloseDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    /* ---------- CREATE LEAD ---------- */
    const lead = await tx.lead.create({
      data: {
        title: service.name,
        description: service.description ?? null,
        pipeline_id: pipeline.id,
        stage_id: stage.id,
        company_profile_id: company.id,
        lead_contact_id: contact.id,
        created_by: SYSTEM_USER_ID,
        updated_by: SYSTEM_USER_ID,
        expected_close_date: expectedCloseDate,
      },
      select: { id: true },
    });

    /* ---------- TAG LINK ---------- */
    await tx.leadTagMap.create({
      data: {
        lead_id: lead.id,
        tag_id: tag.id,
      },
    });

    /* ---------- SOURCE DATA ---------- */
    await tx.leadSourceData.create({
      data: {
        lead_id: lead.id,
        source: "WEBSITE_FORM",
        is_system: false,
        is_finalized: isFinalStep ? true : false,
        external_id: leadHash,
        raw_payload: {
          ...payload,
          ip_address: ip_address ?? null,
        },
      },
    });

    /* ---------- ROUND ROBIN ASSIGNMENT ---------- */
    const [users, superAdmin] = await Promise.all([
      tx.adminUser.findMany({
        where: {
          status: "ACTIVE",
          deleted_at: null,
          admin_role: {
            not: "SUPER_ADMIN",
          },
          permissions: {
            some: {
              permission: { code: "AUTO_ASSIGN_LEADS" },
            },
          },
        },
        orderBy: {
          id: "asc",
        },
        select: { id: true, name: true },
      }),
      tx.adminUser.findFirst({
        where: {
          admin_role: "SUPER_ADMIN",
          status: "ACTIVE",
          deleted_at: null,
          permissions: {
            some: {
              permission: {
                code: "AUTO_ASSIGN_LEADS",
              },
            },
          },
        },
        select: { id: true, name: true },
      }),
    ]);

    let ownerId = null;

    if (users.length > 0) {
      const config = await tx.systemConfig.findUnique({
        where: { key: "AUTO_ASSIGN_POINTER" },
      });

      const pointer = config ? parseInt(config.value, 10) : 0;
      const index = pointer % users.length;
      ownerId = users[index].id;

      await tx.systemConfig.upsert({
        where: { key: "AUTO_ASSIGN_POINTER" },
        update: { value: String(pointer + 1) },
        create: { key: "AUTO_ASSIGN_POINTER", value: "1" },
      });
    }

    if (!ownerId && superAdmin) {
      ownerId = superAdmin.id;
    }

    if (!ownerId) {
      throw new Error("No user available for lead assignment");
    }

    const assignmentData = [
      {
        lead_id: lead.id,
        admin_user_id: ownerId,
        role: "OWNER",
        assigned_by: SYSTEM_USER_ID,
      },
    ];

    if (superAdmin && superAdmin.id !== ownerId) {
      assignmentData.push({
        lead_id: lead.id,
        admin_user_id: superAdmin.id,
        role: "COLLABORATOR",
        assigned_by: SYSTEM_USER_ID,
      });
    }

    await tx.leadAssignment.createMany({ data: assignmentData });

    const assignedUsers = [];

    const ownerUser = users.find((u) => u.id === ownerId);
    if (ownerUser) {
      assignedUsers.push(ownerUser);
    }

    if (superAdmin && superAdmin.id !== ownerId) {
      assignedUsers.push(superAdmin);
    }

    return {
      lead,
      assignedUsers,
    };
  });

  // NEW-LEAD NOTIFICATION
  try {
    if (result.assignedUsers.length > 0) {
      await notify(
        result.assignedUsers.map((u) => u.id),
        {
          type: "LEAD_ASSIGNED",
          title: "New lead assigned",
          body: `Lead: ${service.name}`,
          actor_id: SYSTEM_USER_ID,
          actor_name: "System",
          link: `/dashboard/leads-manager?leadId=${result.lead.id}`,
        },
      );
    }
  } catch (err) {
    console.error("Assignment notification failed:", err);
  }

  return {
    status: "CREATED",
    lead_id: result.id,
  };
}

export async function handleExternalLeadProgress(body) {
  const { leadHash, payload, isFinalStep } = body;

  /* ---------------------------------------------------
  STEP 1: FIND EXISTING LEAD VIA SOURCE DATA
  --------------------------------------------------- */
  const sourceData = await prisma.leadSourceData.findUnique({
    where: { external_id: leadHash },
    select: {
      id: true,
      raw_payload: true,
      lead_id: true,
      is_finalized: true,
    },
  });

  /* ---------- NO MATCH → EXIT ---------- */
  if (!sourceData) {
    return {
      status: "IGNORED_NO_LEAD",
    };
  }

  if (sourceData.is_finalized) {
    return {
      status: "IGNORED_ALREADY_FINALIZED",
      lead_id: sourceData.lead_id,
    };
  }

  /* ---------------------------------------------------
  STEP 2: PREPARE EXISTING PAYLOAD
  --------------------------------------------------- */
  const existingPayload =
    sourceData.raw_payload && typeof sourceData.raw_payload === "object"
      ? sourceData.raw_payload
      : {};

  /* ---------------------------------------------------
  STEP 3: TRANSFORM Q/A ARRAY → OBJECT
  --------------------------------------------------- */
  const progressData = {};

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item?.question && item?.answer) {
        progressData[item.question] = item.answer;
      }
    }
  }

  /* ---------------------------------------------------
  STEP 4: MERGE (APPEND AT BOTTOM)
  --------------------------------------------------- */
  const updatedPayload = {
    ...existingPayload,
    ...progressData,
  };

  /* ---------------------------------------------------
  STEP 5: UPDATE SOURCE DATA
  --------------------------------------------------- */
  await prisma.leadSourceData.update({
    where: {
      id: sourceData.id,
    },
    data: {
      raw_payload: updatedPayload,
      is_finalized: isFinalStep ? true : sourceData.is_finalized,
    },
  });

  return {
    status: "UPDATED",
    lead_id: sourceData.lead_id,
  };
}

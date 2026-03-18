import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";
import { handleLeadStageChange } from "./analytics/orchestrator";
import { onLeadCreated, onLeadAssigned } from "./analytics/aggregator";
import { addLeadActivityLog } from "../shared/comments.service";
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

  const [pipeline, company, contact] = await Promise.all([
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
        deleted_at: null,
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

  /* ----------------------------------------
  Resolve Default Stage
  ---------------------------------------- */

  const stage = await prisma.leadPipelineStage.findFirst({
    where: {
      pipeline_id: payload.pipeline_id,
    },
    orderBy: {
      stage_order: "asc",
    },
    select: { id: true, name: true },
  });

  if (!stage) {
    throw new ValidationError("Pipeline has no stages configured");
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

        source: payload.source,

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
        is_system: payload.source !== "MANUAL",
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
    await onLeadCreated(tx, analyticsLead);

    // 2. Lead assigned (OWNER)
    await onLeadAssigned(tx, analyticsLead, adminUserId);

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

  return result;
}

export async function updateLead(lead_id, payload, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  Validate Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      expected_close_date: true,

      company_profile_id: true,
      company_profile: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        select: {
          tag_id: true,
        },
      },

      lead_contact_id: true,
      contact: {
        select: {
          id: true,
          contact_person: true,
        },
      },
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

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  const originalLead = structuredClone(lead);
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

  /* ----------------------------------------
  Validate Company (if provided)
  ---------------------------------------- */

  if (payload.company_profile_id) {
    const company = await prisma.companyProfile.findFirst({
      where: {
        id: payload.company_profile_id,
        is_active: true,
      },
      select: { id: true },
    });

    if (!company) {
      throw new ValidationError("Invalid or inactive company profile");
    }
  }

  /* ----------------------------------------
  Validate Lead Contact (if provided)
  ---------------------------------------- */

  if (payload.lead_contact_id) {
    const contact = await prisma.leadContact.findFirst({
      where: {
        id: payload.lead_contact_id,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!contact) {
      throw new ValidationError("Invalid lead contact");
    }
  }

  /* ----------------------------------------
  Validate Tags (if provided)
  ---------------------------------------- */

  let validTagIds = [];

  if (payload.tags) {
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
  Validate Reference (if provided)
  ---------------------------------------- */

  const ref = payload.reference;

  if (ref) {
    if (ref.type === "INFLUENCER") {
      const influencer = await prisma.influencer.findFirst({
        where: {
          id: ref.influencer_id,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (!influencer) {
        throw new ValidationError("Invalid influencer reference");
      }
    }

    if (ref.type === "ENTITY") {
      const entity = await prisma.entity.findUnique({
        where: { id: ref.entity_id },
        select: { id: true },
      });

      if (!entity) {
        throw new ValidationError("Invalid entity reference");
      }
    }

    if (ref.type === "LEAD_CONTACT") {
      const contact = await prisma.leadContact.findFirst({
        where: {
          id: ref.lead_contact_id,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (!contact) {
        throw new ValidationError("Invalid lead contact reference");
      }
    }
  }

  /* ----------------------------------------
  Transaction
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    /* Update Lead Metadata */

    const updatedLead = await tx.lead.update({
      where: { id: lead_id },
      data: {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        expected_close_date: payload.expected_close_date
          ? new Date(payload.expected_close_date)
          : undefined,
        company_profile_id: payload.company_profile_id,
        lead_contact_id: payload.lead_contact_id,
        updated_by: adminUserId,
        updated_at: now,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        expected_close_date: true,
        updated_at: true,
      },
    });

    /* ----------------------------------------
    Sync Tags
    ---------------------------------------- */

    if (payload.tags) {
      const existing = await tx.leadTagMap.findMany({
        where: { lead_id },
        select: { tag_id: true },
      });

      const existingIds = existing.map((t) => t.tag_id);

      const toAdd = validTagIds.filter((id) => !existingIds.includes(id));
      const toRemove = existingIds.filter((id) => !validTagIds.includes(id));

      if (toRemove.length) {
        await tx.leadTagMap.deleteMany({
          where: {
            lead_id,
            tag_id: { in: toRemove },
          },
        });
      }

      if (toAdd.length) {
        await tx.leadTagMap.createMany({
          data: toAdd.map((tagId) => ({
            lead_id,
            tag_id: tagId,
          })),
        });
      }
    }

    /* ----------------------------------------
    Handle Reference
    ---------------------------------------- */

    if (payload.reference === null) {
      await tx.leadReference.deleteMany({
        where: { lead_id },
      });
    }

    if (ref) {
      await tx.leadReference.deleteMany({
        where: { lead_id },
      });

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

    return updatedLead;
  });

  // CHANGE-LOG
  const changes = [];
  if (payload.title && payload.title !== originalLead.title) {
    changes.push({
      field: "title",
      from: originalLead.title,
      to: payload.title,
    });
  }
  if (payload.priority && payload.priority !== originalLead.priority) {
    changes.push({
      field: "priority",
      from: originalLead.priority,
      to: payload.priority,
    });
  }
  if (
    payload.company_profile_id &&
    payload.company_profile_id !== originalLead.company_profile_id
  ) {
    const newCompany = await prisma.companyProfile.findUnique({
      where: { id: payload.company_profile_id },
      select: { id: true, name: true },
    });

    changes.push({
      field: "company",
      from: originalLead.company_profile
        ? {
            id: originalLead.company_profile.id,
            name: originalLead.company_profile.name,
          }
        : null,
      to: newCompany
        ? {
            id: newCompany.id,
            name: newCompany.name,
          }
        : null,
    });
  }
  if (
    payload.lead_contact_id &&
    payload.lead_contact_id !== originalLead.lead_contact_id
  ) {
    const newContact = await prisma.leadContact.findUnique({
      where: { id: payload.lead_contact_id },
      select: { id: true, contact_person: true },
    });

    changes.push({
      field: "contact",
      from: originalLead.contact
        ? {
            id: originalLead.contact.id,
            name: originalLead.contact.contact_person,
          }
        : null,
      to: newContact
        ? {
            id: newContact.id,
            name: newContact.contact_person,
          }
        : null,
    });
  }
  if (payload.reference !== undefined) {
    changes.push({
      field: "reference",
      from: originalLead.reference
        ? {
            id: originalLead.reference.id,
            type: originalLead.reference.type,
            name: originalLead.reference.name,
          }
        : null,
      to:
        payload.reference === null
          ? null
          : {
              type: payload.reference.type,
              id:
                payload.reference.influencer_id ||
                payload.reference.entity_id ||
                payload.reference.lead_contact_id ||
                null,
            },
    });
  }
  if (payload.tags) {
    changes.push({
      field: "tags",
      from: originalLead.tags?.map((t) => t.tag_id) || [],
      to: validTagIds,
    });
  }

  if (payload.description && payload.description !== originalLead.description) {
    changes.push({
      field: "description",
      from: originalLead.description,
      to: payload.description,
    });
  }
  if (
    payload.expected_close_date &&
    new Date(payload.expected_close_date).getTime() !==
      new Date(originalLead.expected_close_date).getTime()
  ) {
    changes.push({
      field: "expected_close_date",
      from: originalLead.expected_close_date,
      to: payload.expected_close_date,
    });
  }

  if (changes.length) {
    await addLeadActivityLog( result.id, adminUserId, {
      action: "LEAD_UPDATED",
      message: buildActivityMessage(changes),
      meta: { changes },
    });
  }
  return result;
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
        source: lead.source || null,
        stage_updated_at: lead.stage_updated_at,
      },
      oldStage,
      newStage: stage,
      ownerId: owner?.admin_user_id || null,
      closedBy: adminUserId,
    });

    return updatedLead;
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

  await addLeadActivityLog( lead_id, adminUserId, {
    action: "LEAD_STAGE_CHANGED",
    message: buildActivityMessage(changes),
    meta: { changes },
  });

  return result;
}

export async function updateLeadTags(lead_id, payload, admin_user) {
  const adminUserId = admin_user.id;

  /* ----------------------------------------
  Validate Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

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

  /* ----------------------------------------
  Validate Tags
  ---------------------------------------- */

  const tags = await prisma.leadTag.findMany({
    where: {
      id: { in: payload.tag_ids },
      deleted_at: null,
    },
    select: { id: true },
  });

  if (tags.length !== payload.tag_ids.length) {
    throw new ValidationError("One or more tags are invalid");
  }

  const validTagIds = tags.map((t) => t.id);

  /* ----------------------------------------
  Transaction
  ---------------------------------------- */

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.leadTagMap.findMany({
      where: { lead_id },
      select: { tag_id: true },
    });

    const existingIds = existing.map((t) => t.tag_id);

    const toAdd = validTagIds.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !validTagIds.includes(id));

    if (toRemove.length) {
      await tx.leadTagMap.deleteMany({
        where: {
          lead_id,
          tag_id: { in: toRemove },
        },
      });
    }

    if (toAdd.length) {
      await tx.leadTagMap.createMany({
        data: toAdd.map((tagId) => ({
          lead_id,
          tag_id: tagId,
        })),
      });
    }

    return {
      lead_id,
      tag_ids: validTagIds,
    };
  });

  return result;
}

export async function deleteLead(lead_id, admin_user) {
  const adminUserId = admin_user.id;
  const now = new Date();

  /* ----------------------------------------
  Fetch Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: { id: lead_id, deleted_at: null },
    select: { id: true, created_by: true },
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
  Soft Delete
  ---------------------------------------- */

  const result = await prisma.lead.update({
    where: { id: lead_id },
    data: {
      deleted_at: now,
      deleted_by: adminUserId,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });

  // CHANGE-LOG
  await addLeadActivityLog( lead_id, adminUserId, {
    action: "LEAD_DELETED",
    message: "Lead deleted",
    meta: {
      deleted_by: adminUserId,
      deleted_at: now,
    },
  });

  return result;
}

export async function getLeadDetails(lead_id, admin_user) {
  const adminUserId = admin_user.id;

  /* ----------------------------------------
  Assignment Check
  ---------------------------------------- */

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

  /* ----------------------------------------
  Fetch Lead
  ---------------------------------------- */

  const lead = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    include: {
      contact: true,

      company_profile: {
        select: {
          id: true,
          name: true,
        },
      },

      pipeline: {
        select: {
          id: true,
          name: true,
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

      reference: true,

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
  Fetch First 10 Activities
  ---------------------------------------- */

  const activities = await prisma.leadActivity.findMany({
    where: {
      lead_id,
      deleted_at: null,
    },

    orderBy: {
      created_at: "desc",
    },

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
        },
      },

      video_call_meta: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const now = new Date();

  const activityItems = activities.map((a) => ({
    id: a.id,

    type: a.activity_type,
    status: a.status,

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

    is_overdue:
      a.status === "ACTIVE" && a.scheduled_at && new Date(a.scheduled_at) < now,

    created_by: a.creator,
    updated_by: a.updater,
    closed_by: a.closer,

    email: a.email_message
      ? {
          linked: true,
          sent: !!a.email_message.sent_at,
        }
      : null,

    video_call: a.video_call_meta
      ? {
          linked: true,
          status: a.video_call_meta.status,
        }
      : null,
  }));

  /* ----------------------------------------
  Response
  ---------------------------------------- */

  return {
    id: lead.id,

    title: lead.title,
    description: lead.description,

    priority: lead.priority,
    expected_close_date: lead.expected_close_date,

    created_at: lead.created_at,
    updated_at: lead.updated_at,

    pipeline: lead.pipeline,
    stage: lead.stage,

    contact: lead.contact,

    company_profile: lead.company_profile,

    reference: lead.reference,

    tags: lead.tags.map((t) => t.tag),

    activities: {
      items: activityItems,
      has_more: activities.length === 10,
    },
  };
}

export async function listPipelineLeads(pipeline_id, query, admin_user) {
  const limit = query.limit || 8;
  const adminUserId = admin_user.id;

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
  Fetch Stages (filtered if stage_ids provided)
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
          priority: true,
          expected_close_date: true,
          created_at: true,
        },
      });

      let next_cursor = null;

      if (rows.length > limit) {
        const nextItem = rows.pop();

        next_cursor = {
          cursor_id: nextItem.id,
          cursor_created_at: nextItem.created_at,
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
          priority: l.priority,
          expected_close_date: l.expected_close_date,
          created_at: l.created_at,
        })),

        next_cursor,
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

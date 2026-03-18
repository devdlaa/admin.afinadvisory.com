import { startOfDay } from "date-fns";

/* ----------------------------------------
  Helpers
---------------------------------------- */

export async function upsertLeadStats(prisma, key, increments) {
  return prisma.leadDailyStats.upsert({
    where: {
      date_user_id_closed_by_pipeline_id_stage_id_source_company_profile_id:
        key,
    },
    update: increments,
    create: {
      ...key,
      ...Object.fromEntries(
        Object.entries(increments).map(([k, v]) => [k, v.increment || 0]),
      ),
    },
  });
}

export async function upsertLeadSourceStats(prisma, key, increments) {
  return prisma.leadSourceStats.upsert({
    where: {
      date_source_company_profile_id: key,
    },
    update: increments,
    create: {
      ...key,
      ...Object.fromEntries(
        Object.entries(increments).map(([k, v]) => [k, v.increment || 0]),
      ),
    },
  });
}

/* ----------------------------------------
  Lead Created
---------------------------------------- */

export async function onLeadCreated(prisma, lead) {
  const date = startOfDay(new Date());

  await upsertLeadStats(
    prisma,
    {
      date,
      user_id: null,
      closed_by: null,
      pipeline_id: lead.pipelineId,
      stage_id: lead.stageId,
      source: lead.source || null,
      company_profile_id: lead.companyProfileId,
    },
    {
      leads_created: { increment: 1 },
    },
  );

  if (lead.source) {
    await upsertLeadSourceStats(
      prisma,
      {
        date,
        source: lead.source,
        company_profile_id: lead.companyProfileId,
      },
      {
        leads_created: { increment: 1 },
      },
    );
  }
}

/* ----------------------------------------
  Lead Assigned
---------------------------------------- */

export async function onLeadAssignedBulk(prisma, lead, userIds) {
  const date = startOfDay(new Date());

  await Promise.all(
    userIds.map((userId) =>
      upsertLeadStats(
        prisma,
        {
          date,
          user_id: userId,
          closed_by: null,
          pipeline_id: lead.pipelineId,
          stage_id: lead.stageId,
          source: lead.source || null,
          company_profile_id: lead.companyProfileId,
        },
        {
          leads_assigned: { increment: 1 },
        },
      ),
    ),
  );
}

/* ----------------------------------------
  Stage Movement
---------------------------------------- */

export async function onStageChanged(prisma, lead, fromStageId, toStageId) {
  const base = {
    date: startOfDay(new Date()),
    user_id: lead.ownerId || null,
    closed_by: null,
    pipeline_id: lead.pipelineId,
    source: lead.source || null,
    company_profile_id: lead.companyProfileId,
  };

  if (fromStageId) {
    await upsertLeadStats(
      prisma,
      { ...base, stage_id: fromStageId },
      {
        stage_exits: { increment: 1 },
      },
    );
  }

  await upsertLeadStats(
    prisma,
    { ...base, stage_id: toStageId },
    {
      stage_entries: { increment: 1 },
    },
  );
}

/* ----------------------------------------
  Lead Won / Lost
---------------------------------------- */

export async function onLeadWon(prisma, lead, closedByUserId) {
  const date = startOfDay(new Date());

  const key = {
    date,
    user_id: lead.ownerId || null,
    closed_by: closedByUserId,
    pipeline_id: lead.pipelineId,
    stage_id: lead.stageId,
    source: lead.source || null,
    company_profile_id: lead.companyProfileId,
  };

  await upsertLeadStats(prisma, key, {
    leads_converted: { increment: 1 },
  });

  if (lead.source) {
    await upsertLeadSourceStats(
      prisma,
      {
        date,
        source: lead.source,
        company_profile_id: lead.companyProfileId,
      },
      {
        leads_converted: { increment: 1 },
      },
    );
  }
}

export async function onLeadLost(prisma, lead, closedByUserId) {
  const date = startOfDay(new Date());

  const key = {
    date,
    user_id: lead.ownerId || null,
    closed_by: closedByUserId,
    pipeline_id: lead.pipelineId,
    stage_id: lead.stageId,
    source: lead.source || null,
    company_profile_id: lead.companyProfileId,
  };

  await upsertLeadStats(prisma, key, {
    leads_lost: { increment: 1 },
  });

  if (lead.source) {
    await upsertLeadSourceStats(
      prisma,
      {
        date,
        source: lead.source,
        company_profile_id: lead.companyProfileId,
      },
      {
        leads_lost: { increment: 1 },
      },
    );
  }
}

/* ----------------------------------------
  Reopen
---------------------------------------- */

export async function onLeadReopened(prisma, lead, oldStage) {
  const date = startOfDay(new Date());

  const field = oldStage.is_won ? "leads_converted" : "leads_lost";

  const base = {
    date,
    user_id: lead.ownerId || null,
    pipeline_id: lead.pipelineId,
    stage_id: lead.stageId,
    source: lead.source || null,
    company_profile_id: lead.companyProfileId,
  };

  // 1. Fix LeadDailyStats
  await prisma.leadDailyStats.updateMany({
    where: base,
    data: {
      [field]: { decrement: 1 },
    },
  });

  // 2.  LeadSourceStats
  if (lead.source) {
    await prisma.leadSourceStats.updateMany({
      where: {
        date,
        source: lead.source,
        company_profile_id: lead.companyProfileId,
      },
      data: {
        [field]: { decrement: 1 },
      },
    });
  }
}

export async function onActivityCompleted(prisma, activity) {
  const key = {
    date: startOfDay(new Date()),
    user_id: activity.created_by,
    company_profile_id: activity.companyProfileId,
  };

  const map = {
    CALL: "calls_done",
    EMAIL: "emails_sent",
    VIDEO_CALL: "meetings_done",
    WHATSAPP: "whatsapp_sent",
  };

  const field = map[activity.activity_type];

  await prisma.activityDailyStats.upsert({
    where: {
      date_user_id_company_profile_id: key,
    },
    update: {
      activities_completed: { increment: 1 },
      ...(field && { [field]: { increment: 1 } }),
    },
    create: {
      ...key,
      activities_completed: 1,
      ...(field && { [field]: 1 }),
    },
  });
}

export async function onActivityMissed(prisma, activity) {
  const key = {
    date: startOfDay(new Date()),
    user_id: activity.created_by,
    company_profile_id: activity.companyProfileId,
  };

  await prisma.activityDailyStats.upsert({
    where: {
      date_user_id_company_profile_id: key,
    },
    update: {
      activities_missed: { increment: 1 },
    },
    create: {
      ...key,
      activities_missed: 1,
    },
  });
}

export async function onStageDurationTracked(
  prisma,
  lead,
  oldStageId,
  timeSpentSeconds,
) {
  const key = {
    date: startOfDay(new Date()),
    stage_id: oldStageId,
    pipeline_id: lead.pipelineId,
    user_id: lead.ownerId || null,
    company_profile_id: lead.companyProfileId,
  };

  await prisma.leadStageDuration.upsert({
    where: {
      date_stage_id_pipeline_id_user_id_company_profile_id: key,
    },
    update: {
      total_time_spent: { increment: timeSpentSeconds },
      leads_count: { increment: 1 },
    },
    create: {
      ...key,
      total_time_spent: timeSpentSeconds,
      leads_count: 1,
    },
  });
}


import { prisma } from "@/utils/server/db";
import { NotFoundError, ValidationError } from "@/utils/server/errors";

export async function getOverview(filters) {
  const {
    range_type,
    company_profile_id,
    pipeline_id,
    stage_id,
    user_id,
    source,
  } = filters;

  /**
   * --------------------------------
   * RANGE BUILDER
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { from: start, to: new Date() };
      }

      case "LAST_15_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 14);
        return { from, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_3_MONTHS":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: new Date(),
        };

      case "THIS_YEAR":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(),
        };

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * WHERE BUILDERS
   * --------------------------------
   */

  const leadWhere = {
    company_profile_id,
    date: dateFilter,
    ...(pipeline_id && { pipeline_id }),
    ...(stage_id && { stage_id }),
    ...(user_id && { user_id }),
    ...(source && { source }),
  };

  const activityWhere = {
    company_profile_id,
    date: dateFilter,
    ...(user_id && { user_id }),
  };

  /**
   * --------------------------------
   * PARALLEL CORE QUERIES
   * --------------------------------
   */

  const [leadSummary, activitySummary, pipelineStats] = await Promise.all([
    prisma.leadDailyStats.aggregate({
      where: leadWhere,
      _sum: {
        leads_created: true,
        leads_converted: true,
        leads_lost: true,
      },
    }),

    prisma.activityDailyStats.aggregate({
      where: activityWhere,
      _sum: {
        activities_completed: true,
        activities_missed: true,
      },
    }),

    prisma.leadDailyStats.groupBy({
      by: ["pipeline_id"],
      where: {
        company_profile_id,
        date: dateFilter,
      },
      _sum: {
        leads_created: true,
        leads_converted: true,
        leads_lost: true,
      },
    }),
  ]);

  /**
   * --------------------------------
   * SUMMARY
   * --------------------------------
   */

  const created = leadSummary._sum.leads_created || 0;
  const converted = leadSummary._sum.leads_converted || 0;
  const lost = leadSummary._sum.leads_lost || 0;

  const active = created - converted - lost;

  const conversionRate = created ? (converted / created) * 100 : 0;

  const lossRate = created ? (lost / created) * 100 : 0;

  /**
   * --------------------------------
   * ACTIVITIES
   * --------------------------------
   */

  const completed = activitySummary._sum.activities_completed || 0;
  const missed = activitySummary._sum.activities_missed || 0;

  const totalActivities = completed + missed;

  const completionRate = totalActivities
    ? (completed / totalActivities) * 100
    : 0;

  /**
   * --------------------------------
   * PIPELINE BREAKDOWN
   * --------------------------------
   */

  let pipelineBreakdown = [];

  if (pipelineStats.length > 0) {
    const pipelineIds = pipelineStats.map((p) => p.pipeline_id);

    const pipelines = await prisma.leadPipeline.findMany({
      where: { id: { in: pipelineIds } },
      select: { id: true, name: true },
    });

    const pipelineMap = Object.fromEntries(
      pipelines.map((p) => [p.id, p.name]),
    );

    pipelineBreakdown = pipelineStats.map((p) => {
      const created = p._sum.leads_created || 0;
      const converted = p._sum.leads_converted || 0;

      return {
        pipeline_id: p.pipeline_id,
        pipeline_name: pipelineMap[p.pipeline_id] || "Unknown",

        leads_created: created,
        leads_converted: converted,
        leads_lost: p._sum.leads_lost || 0,

        conversion_rate: created
          ? Number(((converted / created) * 100).toFixed(2))
          : 0,
      };
    });
  }

  /**
   * --------------------------------
   * CONDITIONAL BREAKDOWNS
   * --------------------------------
   */

  let stageBreakdown = [];
  let sourceBreakdown = [];

  if (pipeline_id) {
    const [stageStats, sourceStatsRaw] = await Promise.all([
      prisma.leadDailyStats.groupBy({
        by: ["stage_id"],
        where: leadWhere,
        _sum: {
          stage_entries: true,
          stage_exits: true,
          leads_converted: true,
        },
      }),

      prisma.leadSourceStats.findMany({
        where: {
          company_profile_id,
          date: dateFilter,
          ...(source && { source }),
        },
      }),
    ]);

    /**
     * STAGE BREAKDOWN
     */
    if (stageStats.length > 0) {
      const stageIds = stageStats.map((s) => s.stage_id);

      const stages = await prisma.leadPipelineStage.findMany({
        where: { id: { in: stageIds } },
        select: { id: true, name: true },
      });

      const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));

      stageBreakdown = stageStats.map((s) => ({
        stage_id: s.stage_id,
        stage_name: stageMap[s.stage_id] || "Unknown",

        entries: s._sum.stage_entries || 0,
        exits: s._sum.stage_exits || 0,
        conversions: s._sum.leads_converted || 0,
      }));
    }

    /**
     * SOURCE BREAKDOWN
     */
    const sourceMap = {};

    for (const s of sourceStatsRaw) {
      if (!sourceMap[s.source]) {
        sourceMap[s.source] = {
          source: s.source,
          created: 0,
          converted: 0,
          lost: 0,
        };
      }

      sourceMap[s.source].created += s.leads_created || 0;
      sourceMap[s.source].converted += s.leads_converted || 0;
      sourceMap[s.source].lost += s.leads_lost || 0;
    }

    sourceBreakdown = Object.values(sourceMap).map((s) => ({
      ...s,
      conversion_rate: s.created
        ? Number(((s.converted / s.created) * 100).toFixed(2))
        : 0,
    }));
  }

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,

    summary: {
      leads_created: created,
      leads_converted: converted,
      leads_lost: lost,

      conversion_rate: Number(conversionRate.toFixed(2)),
      loss_rate: Number(lossRate.toFixed(2)),

      active_leads: active,
    },

    activities: {
      total_completed: completed,
      total_missed: missed,
      completion_rate: Number(completionRate.toFixed(2)),
    },

    pipelines: pipelineBreakdown,

    breakdown: pipeline_id
      ? {
          by_stage: stageBreakdown,
          by_source: sourceBreakdown,
        }
      : null,
  };
}

export async function getFunnel(filters) {
  const { range_type, company_profile_id, pipeline_id } = filters;

  if (!pipeline_id) {
    throw new ValidationError("pipeline_id is required for funnel");
  }

  /**
   * --------------------------------
   * RANGE BUILDER
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { from: start, to: new Date() };
      }

      case "LAST_15_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 14);
        return { from, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_3_MONTHS":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: new Date(),
        };

      case "THIS_YEAR":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(),
        };

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * PARALLEL FETCH
   * --------------------------------
   */

  const [pipeline, stages, stats] = await Promise.all([
    prisma.leadPipeline.findUnique({
      where: { id: pipeline_id },
      select: { id: true, name: true },
    }),

    prisma.leadPipelineStage.findMany({
      where: { pipeline_id },
      orderBy: { stage_order: "asc" },
      select: {
        id: true,
        name: true,
        stage_order: true,
      },
    }),

    prisma.leadDailyStats.groupBy({
      by: ["stage_id"],
      where: {
        company_profile_id,
        pipeline_id,
        date: dateFilter,
      },
      _sum: {
        stage_entries: true,
        stage_exits: true,
      },
    }),
  ]);

  if (!pipeline) {
    throw new NotFoundError("Pipeline not found");
  }

  /**
   * --------------------------------
   * MAP STATS
   * --------------------------------
   */

  const statsMap = Object.fromEntries(
    stats.map((s) => [
      s.stage_id,
      {
        entries: s._sum.stage_entries || 0,
        exits: s._sum.stage_exits || 0,
      },
    ]),
  );

  /**
   * --------------------------------
   * BUILD FUNNEL
   * --------------------------------
   */

  const funnel = stages.map((stage) => {
    const data = statsMap[stage.id] || {
      entries: 0,
      exits: 0,
    };

    const entries = data.entries;
    const exits = data.exits;

    const conversionToNext = entries ? (exits / entries) * 100 : 0;

    const dropOff = 100 - conversionToNext;

    return {
      stage_id: stage.id,
      stage_name: stage.name,
      order: stage.stage_order,

      entries,
      exits,

      conversion_to_next: Number(conversionToNext.toFixed(2)),
      drop_off_rate: Number(dropOff.toFixed(2)),
    };
  });

  /**
   * --------------------------------
   * SUMMARY
   * --------------------------------
   */

  const firstStage = funnel[0] || { entries: 0 };
  const lastStage = funnel[funnel.length - 1] || { exits: 0 };

  const totalEntries = firstStage.entries;
  const finalConversions = lastStage.exits;

  const overallConversion = totalEntries
    ? (finalConversions / totalEntries) * 100
    : 0;

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,

    pipeline,

    funnel,

    summary: {
      total_entries: totalEntries,
      final_conversions: finalConversions,
      overall_conversion_rate: Number(overallConversion.toFixed(2)),
    },
  };
}

export async function getScoreboard(filters) {
  const {
    range_type,
    company_profile_id,
    sort_by = "total_points",
    order = "desc",
    limit = 10,
    offset = 0,
  } = filters;

  /**
   * --------------------------------
   * RANGE BUILDER
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { from: start, to: new Date() };
      }

      case "LAST_15_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 14);
        return { from, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_3_MONTHS":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: new Date(),
        };

      case "THIS_YEAR":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(),
        };

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * PARALLEL FETCH
   * --------------------------------
   */

  const [scoreStats, conversionStats, assignedStats, activityStats] =
    await Promise.all([
      /**
       * SCORES (ALL TIME — NOT FILTERED)
       */
      prisma.leadUserScore.groupBy({
        by: ["user_id"],
        _sum: {
          total_points: true,
          effort_points: true,
          closure_points: true,
          ownership_points: true,
        },
        orderBy: {
          _sum: {
            [sort_by]: order,
          },
        },
        skip: offset,
        take: limit,
      }),

      /**
       * CONVERSIONS + LOST
       */
      prisma.leadDailyStats.groupBy({
        by: ["closed_by"],
        where: {
          company_profile_id,
          date: dateFilter,
          closed_by: { not: null },
        },
        _sum: {
          leads_converted: true,
          leads_lost: true,
        },
      }),

      /**
       * LEADS ASSIGNED
       */
      prisma.leadDailyStats.groupBy({
        by: ["user_id"],
        where: {
          company_profile_id,
          date: dateFilter,
          user_id: { not: null },
        },
        _sum: {
          leads_assigned: true,
        },
      }),

      /**
       * ACTIVITIES
       */
      prisma.activityDailyStats.groupBy({
        by: ["user_id"],
        where: {
          company_profile_id,
          date: dateFilter,
        },
        _sum: {
          activities_completed: true,
        },
      }),
    ]);

  /**
   * --------------------------------
   * MAP HELPERS
   * --------------------------------
   */

  const conversionMap = Object.fromEntries(
    conversionStats.map((c) => [
      c.closed_by,
      {
        converted: c._sum.leads_converted || 0,
        lost: c._sum.leads_lost || 0,
      },
    ]),
  );

  const assignedMap = Object.fromEntries(
    assignedStats.map((a) => [a.user_id, a._sum.leads_assigned || 0]),
  );

  const activityMap = Object.fromEntries(
    activityStats.map((a) => [a.user_id, a._sum.activities_completed || 0]),
  );

  /**
   * --------------------------------
   * FETCH USERS
   * --------------------------------
   */

  const userIds = scoreStats.map((s) => s.user_id).filter(Boolean);

  const users = await prisma.adminUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  /**
   * --------------------------------
   * BUILD LEADERBOARD
   * --------------------------------
   */

  const leaderboard = scoreStats.map((s, index) => {
    const userId = s.user_id;

    const totalPoints = s._sum.total_points || 0;

    const conversions = conversionMap[userId]?.converted || 0;
    const lost = conversionMap[userId]?.lost || 0;

    const leadsHandled = assignedMap[userId] || 0;
    const activities = activityMap[userId] || 0;

    const conversionRate = leadsHandled
      ? (conversions / leadsHandled) * 100
      : 0;

    const efficiency = activities ? (conversions / activities) * 100 : 0;

    return {
      rank: offset + index + 1,

      user_id: userId,
      name: userMap[userId]?.name || "Unknown",

      total_points: totalPoints,

      breakdown: {
        effort: s._sum.effort_points || 0,
        closure: s._sum.closure_points || 0,
        ownership: s._sum.ownership_points || 0,
      },

      conversions,
      leads_handled: leadsHandled,
      leads_lost: lost,

      conversion_rate: Number(conversionRate.toFixed(2)),
      activities_completed: activities,
      efficiency: Number(efficiency.toFixed(2)),
    };
  });

  /**
   * --------------------------------
   * TOTAL USERS
   * --------------------------------
   */

  const totalUsers = await prisma.leadUserScore.count({
    distinct: ["user_id"],
  });

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,

    meta: {
      total_users: totalUsers,
      sort_by,
      order,
    },

    leaderboard,
  };
}

export async function getTimeseries(filters) {
  const {
    range_type,
    company_profile_id,
    pipeline_id,
    user_id,
    interval = "day",
  } = filters;

  /**
   * --------------------------------
   * RANGE BUILDER
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "LAST_7_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 6);
        return { from, to: new Date() };
      }

      case "LAST_30_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 29);
        return { from, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0),
        };

      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        return { from: start, to: new Date() };
      }

      case "LAST_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay() - 7);

        const end = new Date();
        end.setDate(now.getDate() - now.getDay() - 1);

        return { from: start, to: end };
      }

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * FETCH DATA
   * --------------------------------
   */

  const [leadStats, activityStats] = await Promise.all([
    prisma.leadDailyStats.findMany({
      where: {
        company_profile_id,
        date: dateFilter,
        ...(pipeline_id && { pipeline_id }),
        ...(user_id && { user_id }),
      },
      select: {
        date: true,
        leads_created: true,
        leads_converted: true,
        leads_lost: true,
      },
    }),

    prisma.activityDailyStats.findMany({
      where: {
        company_profile_id,
        date: dateFilter,
        ...(user_id && { user_id }),
      },
      select: {
        date: true,
        activities_completed: true,
        activities_missed: true,
      },
    }),
  ]);

  /**
   * --------------------------------
   * SAFE DATE KEY
   * --------------------------------
   */

  const formatDate = (d) => d.toISOString().split("T")[0];

  const getKey = (date) => {
    const d = new Date(date);

    if (interval === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    if (interval === "week") {
      const temp = new Date(d);
      temp.setDate(d.getDate() - d.getDay());
      return formatDate(temp);
    }

    return formatDate(d);
  };

  /**
   * --------------------------------
   * AGGREGATION
   * --------------------------------
   */

  const map = {};

  for (const l of leadStats) {
    const key = getKey(l.date);

    if (!map[key]) {
      map[key] = {
        date: key,
        leads_created: 0,
        leads_converted: 0,
        leads_lost: 0,
        activities_completed: 0,
        activities_missed: 0,
      };
    }

    map[key].leads_created += l.leads_created || 0;
    map[key].leads_converted += l.leads_converted || 0;
    map[key].leads_lost += l.leads_lost || 0;
  }

  for (const a of activityStats) {
    const key = getKey(a.date);

    if (!map[key]) {
      map[key] = {
        date: key,
        leads_created: 0,
        leads_converted: 0,
        leads_lost: 0,
        activities_completed: 0,
        activities_missed: 0,
      };
    }

    map[key].activities_completed += a.activities_completed || 0;
    map[key].activities_missed += a.activities_missed || 0;
  }

  /**
   * --------------------------------
   * GAP FILLING (IMPORTANT FIX)
   * --------------------------------
   */

  const series = [];
  const current = new Date(from);

  while (current <= to) {
    const key = getKey(current);

    if (!map[key]) {
      map[key] = {
        date: key,
        leads_created: 0,
        leads_converted: 0,
        leads_lost: 0,
        activities_completed: 0,
        activities_missed: 0,
      };
    }

    current.setDate(current.getDate() + 1);
  }

  /**
   * --------------------------------
   * FINAL SORT
   * --------------------------------
   */

  const sortedSeries = Object.values(map).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,
    interval,
    series: sortedSeries,
  };
}

export async function getUsersAnalytics(filters) {
  const {
    range_type,
    company_profile_id,
    user_id,
    limit = 10,
    offset = 0,
    include_score = false,
  } = filters;

  /**
   * --------------------------------
   * RANGE BUILDER
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { from: start, to: new Date() };
      }

      case "LAST_15_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 14);
        return { from, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_3_MONTHS":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: new Date(),
        };

      case "THIS_YEAR":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(),
        };

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * PARALLEL QUERIES
   * --------------------------------
   */

  const [assignedStats, conversionStats, activityStats, scoreStats] =
    await Promise.all([
      prisma.leadDailyStats.groupBy({
        by: ["user_id"],
        where: {
          company_profile_id,
          date: dateFilter,
          ...(user_id && { user_id }),
        },
        _sum: {
          leads_assigned: true,
        },
      }),

      prisma.leadDailyStats.groupBy({
        by: ["closed_by"],
        where: {
          company_profile_id,
          date: dateFilter,
          ...(user_id && { closed_by: user_id }),
          closed_by: { not: null },
        },
        _sum: {
          leads_converted: true,
          leads_lost: true,
        },
      }),

      prisma.activityDailyStats.groupBy({
        by: ["user_id"],
        where: {
          company_profile_id,
          date: dateFilter,
          ...(user_id && { user_id }),
        },
        _sum: {
          activities_completed: true,
          activities_missed: true,
        },
      }),

      include_score
        ? prisma.leadUserScore.groupBy({
            by: ["user_id"],
            _sum: {
              total_points: true,
              effort_points: true,
              closure_points: true,
              ownership_points: true,
            },
          })
        : Promise.resolve([]),
    ]);

  /**
   * --------------------------------
   * MAPS
   * --------------------------------
   */

  const assignedMap = Object.fromEntries(
    assignedStats.map((l) => [l.user_id, l._sum.leads_assigned || 0]),
  );

  const conversionMap = Object.fromEntries(
    conversionStats.map((c) => [
      c.closed_by,
      {
        converted: c._sum.leads_converted || 0,
        lost: c._sum.leads_lost || 0,
      },
    ]),
  );

  const activityMap = Object.fromEntries(
    activityStats.map((a) => [
      a.user_id,
      {
        completed: a._sum.activities_completed || 0,
        missed: a._sum.activities_missed || 0,
      },
    ]),
  );

  const scoreMap = Object.fromEntries(
    scoreStats.map((s) => [
      s.user_id,
      {
        total: s._sum.total_points || 0,
        effort: s._sum.effort_points || 0,
        closure: s._sum.closure_points || 0,
        ownership: s._sum.ownership_points || 0,
      },
    ]),
  );

  /**
   * --------------------------------
   * FETCH USERS
   * --------------------------------
   */

  const userIds = new Set(
    [
      ...Object.keys(assignedMap),
      ...Object.keys(conversionMap),
      ...Object.keys(activityMap),
      ...Object.keys(scoreMap),
    ].filter(Boolean),
  );
  const users = await prisma.adminUser.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });

  /**
   * --------------------------------
   * BUILD RESPONSE
   * --------------------------------
   */

  const result = users.map((u) => {
    const assigned = assignedMap[u.id] || 0;

    const conv = conversionMap[u.id] || {
      converted: 0,
      lost: 0,
    };

    const act = activityMap[u.id] || {
      completed: 0,
      missed: 0,
    };

    const score = scoreMap[u.id] || {
      total: 0,
      effort: 0,
      closure: 0,
      ownership: 0,
    };

    const conversionRate = assigned ? (conv.converted / assigned) * 100 : 0;

    const efficiency = act.completed
      ? (conv.converted / act.completed) * 100
      : 0;

    return {
      user_id: u.id,
      name: u.name,

      leads_assigned: assigned,
      leads_converted: conv.converted,
      leads_lost: conv.lost,

      conversion_rate: Number(conversionRate.toFixed(2)),

      activities_completed: act.completed,
      activities_missed: act.missed,

      efficiency: Number(efficiency.toFixed(2)),

      ...(include_score && {
        score: {
          total_points: score.total,
          effort: score.effort,
          closure: score.closure,
          ownership: score.ownership,
        },
      }),
    };
  });

  /**
   * --------------------------------
   * PAGINATION
   * --------------------------------
   */

  const paginated = result.slice(offset, offset + limit);

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,
    meta: {
      total_users: result.length,
    },
    users: paginated,
  };
}

export async function getActivitiesAnalytics(filters) {
  const { range_type, company_profile_id, user_id } = filters;

  /**
   * --------------------------------
   * RANGE BUILDER (FINAL)
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);

        return { from: start, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_3_MONTHS":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: new Date(),
        };

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * FETCH
   * --------------------------------
   */

  const stats = await prisma.activityDailyStats.aggregate({
    where: {
      company_profile_id,
      date: dateFilter,
      ...(user_id && { user_id }),
    },
    _sum: {
      calls_done: true,
      emails_sent: true,
      meetings_done: true,
      whatsapp_sent: true,
      activities_completed: true,
      activities_missed: true,
    },
  });

  /**
   * --------------------------------
   * EXTRACT
   * --------------------------------
   */

  const calls = stats._sum.calls_done || 0;
  const emails = stats._sum.emails_sent || 0;
  const meetings = stats._sum.meetings_done || 0;
  const whatsapp = stats._sum.whatsapp_sent || 0;

  const completed = stats._sum.activities_completed || 0;
  const missed = stats._sum.activities_missed || 0;

  const total = completed + missed;

  const completionRate = total ? (completed / total) * 100 : 0;

  /**
   * --------------------------------
   * ACTIVITY MIX (INSIGHT)
   * --------------------------------
   */

  const totalActivities = calls + emails + meetings + whatsapp;

  const activityMix = totalActivities
    ? {
        calls_pct: Number(((calls / totalActivities) * 100).toFixed(2)),
        emails_pct: Number(((emails / totalActivities) * 100).toFixed(2)),
        meetings_pct: Number(((meetings / totalActivities) * 100).toFixed(2)),
        whatsapp_pct: Number(((whatsapp / totalActivities) * 100).toFixed(2)),
      }
    : null;

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,

    summary: {
      total_completed: completed,
      total_missed: missed,
      completion_rate: Number(completionRate.toFixed(2)),
    },

    breakdown: {
      calls,
      emails,
      meetings,
      whatsapp,
    },

    ...(activityMix && { activity_mix: activityMix }),
  };
}

export async function getStageDuration(filters) {
  const { range_type, company_profile_id, pipeline_id } = filters;

  if (!pipeline_id) {
    throw new ValidationError("pipeline_id is required");
  }

  /**
   * --------------------------------
   * RANGE BUILDER
   * --------------------------------
   */

  function getDateRange(range_type) {
    const now = new Date();

    switch (range_type) {
      case "THIS_WEEK": {
        const start = new Date();
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        return { from: start, to: new Date() };
      }

      case "LAST_15_DAYS": {
        const from = new Date();
        from.setDate(now.getDate() - 14);
        return { from, to: new Date() };
      }

      case "THIS_MONTH":
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(),
        };

      case "LAST_3_MONTHS":
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 2, 1),
          to: new Date(),
        };

      case "THIS_YEAR":
        return {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(),
        };

      default:
        throw new Error("Invalid range_type");
    }
  }

  const { from, to } = getDateRange(range_type);

  const dateFilter = {
    gte: from,
    lte: to,
  };

  /**
   * --------------------------------
   * PARALLEL FETCH
   * --------------------------------
   */

  const [pipeline, stats] = await Promise.all([
    prisma.leadPipeline.findUnique({
      where: { id: pipeline_id },
      select: { id: true, name: true },
    }),

    prisma.leadStageDuration.groupBy({
      by: ["stage_id"],
      where: {
        company_profile_id,
        pipeline_id,
        date: dateFilter,
      },
      _sum: {
        total_time_spent: true,
        leads_count: true,
      },
    }),
  ]);

  if (!pipeline) {
    throw new NotFoundError("Pipeline not found");
  }

  /**
   * --------------------------------
   * FETCH STAGES
   * --------------------------------
   */

  const stageIds = stats.map((s) => s.stage_id);

  const stages = await prisma.leadPipelineStage.findMany({
    where: {
      id: { in: stageIds },
      pipeline_id,
    },
    select: {
      id: true,
      name: true,
      stage_order: true,
    },
  });

  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s]));

  /**
   * --------------------------------
   * BUILD RESPONSE
   * --------------------------------
   */

  const result = stats.map((s) => {
    const totalTime = s._sum.total_time_spent || 0;
    const leads = s._sum.leads_count || 0;

    const avgTime = leads ? totalTime / leads : 0;

    return {
      stage_id: s.stage_id,
      stage_name: stageMap[s.stage_id]?.name || "Unknown",
      order: stageMap[s.stage_id]?.stage_order || 0,

      avg_time_spent: Number(avgTime.toFixed(2)),
      total_time_spent: Number(totalTime.toFixed(2)),
      leads_count: leads,
    };
  });

  result.sort((a, b) => a.order - b.order);

  /**
   * --------------------------------
   * FINAL RESPONSE
   * --------------------------------
   */

  return {
    range_type,
    pipeline,
    stages: result,
  };
}

export async function getLeadTeamEffort(lead_id, admin_user) {
  /* ----------------------------------------
  Assignment Check
  ---------------------------------------- */

  if (admin_user.admin_role !== "SUPER_ADMIN") {
    const assignment = await prisma.leadAssignment.findFirst({
      where: {
        lead_id,
        admin_user_id: admin_user.id,
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenError("You are not assigned to this lead");
    }
  }

  /* ----------------------------------------
  Lead Exists Check
  ---------------------------------------- */

  const leadExists = await prisma.lead.findFirst({
    where: {
      id: lead_id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!leadExists) {
    throw new NotFoundError("Lead not found");
  }

  /* ----------------------------------------
  Fetch Scores
  ---------------------------------------- */

  const scores = await prisma.leadUserScore.findMany({
    where: { lead_id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!scores.length) {
    return {
      totalPoints: 0,
      members: [],
    };
  }

  const totalTeamPoints = scores.reduce((sum, s) => sum + s.total_points, 0);

  const members = scores
    .sort((a, b) => b.total_points - a.total_points)
    .map((s) => {
      const effortPercent = totalTeamPoints
        ? Number(((s.total_points / totalTeamPoints) * 100).toFixed(1))
        : 0;

      return {
        id: s.user.id,
        name: s.user.name,
        points: Number(s.total_points.toFixed(1)),
        effortPercent,
        breakdown: {
          effort: Number(s.effort_points.toFixed(1)),
          closure: Number(s.closure_points.toFixed(1)),
          ownership: Number(s.ownership_points.toFixed(1)),
        },
      };
    });

  return {
    totalPoints: Number(totalTeamPoints.toFixed(1)),
    members,
    lastFetchedAt: new Date().toISOString(),
  };
}

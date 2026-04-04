import { z } from "zod";

/**
 * --------------------------------
 * ENUMS
 * --------------------------------
 */

export const leadSourceEnum = z.enum([
  "MANUAL",
  "WEBSITE_FORM",
  "FACEBOOK_AD",
  "INSTAGRAM_AD",
  "GOOGLE_AD",
  "YOUTUBE_AD",
  "WHATSAPP",
  "REFERRAL",
  "EVENT",
  "COLD_CALL",
  "PARTNER",
  "OTHER",
]);

export const rangeTypeEnum = z.enum([
  "THIS_WEEK",
  "LAST_15_DAYS",
  "THIS_MONTH",
  "LAST_3_MONTHS",
  "THIS_YEAR",
]);

/**
 * --------------------------------
 * BASE FILTERS (REUSABLE)
 * --------------------------------
 */

export const baseAnalyticsFilterSchema = z.object({
  range_type: rangeTypeEnum,

  company_profile_id: z.string().uuid(),

  pipeline_id: z.string().uuid().optional(),
  stage_id: z.string().uuid().optional(),

  user_id: z.string().uuid().optional(),
  closed_by: z.string().uuid().optional(),

  source: leadSourceEnum.optional(),
});

/**
 * --------------------------------
 * PAGINATION
 * --------------------------------
 */

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * --------------------------------
 * OVERVIEW
 * --------------------------------
 */

export const overviewQuerySchema = baseAnalyticsFilterSchema;

/**
 * --------------------------------
 * FUNNEL
 * --------------------------------
 */

export const funnelQuerySchema = baseAnalyticsFilterSchema.extend({
  pipeline_id: z.string().uuid(), // required
});

/**
 * --------------------------------
 * USERS
 * --------------------------------
 */

export const usersQuerySchema = baseAnalyticsFilterSchema
  .extend({
    include_score: z.coerce.boolean().default(true),
  })
  .merge(paginationSchema);

/**
 * --------------------------------
 * SCOREBOARD
 * --------------------------------
 */

export const scoreboardQuerySchema = z
  .object({
    range_type: rangeTypeEnum,
    company_profile_id: z.string().uuid(),

    sort_by: z
      .enum(["total_points", "effort_points", "closure_points"])
      .default("total_points"),

    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .merge(paginationSchema);

/**
 * --------------------------------
 * ACTIVITIES
 * --------------------------------
 */

export const activitiesQuerySchema = baseAnalyticsFilterSchema;

/**
 * --------------------------------
 * STAGE DURATION
 * --------------------------------
 */

export const stageDurationQuerySchema = baseAnalyticsFilterSchema.extend({
  pipeline_id: z.string().uuid(), // required
});

/**
 * --------------------------------
 * TIMESERIES
 * --------------------------------
 */

export const timeseriesQuerySchema = z.object({
  company_profile_id: z.string().uuid(),

  range_type: rangeTypeEnum,

  pipeline_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),

  interval: z.enum(["day", "week", "month"]).default("day"),
});

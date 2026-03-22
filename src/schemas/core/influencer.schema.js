import { z } from "zod";

export const SOCIAL_PLATFORMS = [
  "LINKEDIN",
  "TWITTER",
  "FACEBOOK",
  "INSTAGRAM",
  "YOUTUBE",
  "OTHER",
];

export const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().trim().url("Invalid social media URL"),
});

export const uniqueLinksArray = (schema) =>
  schema.superRefine((links, ctx) => {
    const urls = links.map((l) => l.url.trim().toLowerCase());
    const duplicates = urls.filter((url, i) => urls.indexOf(url) !== i);

    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate social media links are not allowed",
      });
    }
  });

/* CREATE */

export const createInfluencerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(20),

  social_links: uniqueLinksArray(z.array(socialLinkSchema).max(20))
    .optional()
    .default([]),
});

/* UPDATE */

export const updateInfluencerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(5).max(20).optional(),

  social_links: uniqueLinksArray(z.array(socialLinkSchema).max(20)).optional(),
});

/* ID PARAM */

export const influencerIdSchema = z.object({
  id: z.string().uuid(),
});

/* LIST (Cursor Pagination + Search) */

export const listInfluencerSchema = z.object({
  cursor: z.string().uuid().optional(),

  page_size: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(20),

  search: z.string().trim().max(120).optional(),

  sort_by: z
    .enum(["created_at", "reference_count"])
    .optional()
    .default("created_at"),

  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),

  compact: z.union([z.string(), z.boolean()]).optional(),
});

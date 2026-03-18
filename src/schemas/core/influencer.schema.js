import { z } from "zod";

const SOCIAL_PLATFORMS = [
  "LINKEDIN",
  "TWITTER",
  "FACEBOOK",
  "INSTAGRAM",
  "YOUTUBE",
  "OTHER",
];

const socialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string().trim().url("Invalid social media URL"),
});

const uniqueLinksArray = (schema) =>
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

const createInfluencerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(20),

  social_links: uniqueLinksArray(z.array(socialLinkSchema).max(20))
    .optional()
    .default([]),
});

/* UPDATE */

const updateInfluencerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(5).max(20).optional(),

  social_links: uniqueLinksArray(z.array(socialLinkSchema).max(20)).optional(),
});

/* ID PARAM */

const influencerIdSchema = z.object({
  id: z.string().uuid(),
});

/* LIST (Cursor Pagination + Search) */

const listInfluencerSchema = z.object({
  page: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1))
    .optional()
    .default(1),

  page_size: z
    .string()
    .transform((v) => parseInt(v))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(20),

  search: z.string().trim().max(120).optional(),
});

module.exports = {
  createInfluencerSchema,
  updateInfluencerSchema,
  influencerIdSchema,
  listInfluencerSchema,
};

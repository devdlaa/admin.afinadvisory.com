import { z } from "zod";

export const checklistItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  is_done: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

export const checklistSyncSchema = z.object({
  items: z
    .array(checklistItemSchema)
    .max(100, "Checklist too large")
    .default([]),
});

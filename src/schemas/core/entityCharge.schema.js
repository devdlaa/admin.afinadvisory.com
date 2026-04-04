import { z } from "zod";

export const createEntityAdhocChargeSchema = z.object({
  params: z.object({
    entity_id: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200),
    amount: z.number().positive(),
    charge_type: z
      .enum(["EXTERNAL_CHARGE", "GOVERNMENT_FEE", "SERVICE_FEE"])
      .default("SERVICE_FEE"),
    bearer: z.enum(["CLIENT"]).optional().default("CLIENT"),
    status: z
      .enum(["NOT_PAID", "PAID", "WRITTEN_OFF"])
      .optional()
      .default("NOT_PAID"),
    remark: z.string().max(2000).optional().nullable(),
  }),
});

export const updateEntityAdhocChargeSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      amount: z.number().positive().optional(),
      charge_type: z
        .enum(["EXTERNAL_CHARGE", "GOVERNMENT_FEE", "SERVICE_FEE"])
        .optional(),
      status: z.enum(["NOT_PAID", "PAID", "WRITTEN_OFF"]).optional(),
      remark: z.string().max(2000).nullable().optional(),
    })
    .refine((v) => Object.keys(v).length > 0),
});

export const deleteEntityAdhocChargeSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

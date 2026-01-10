import { z } from "zod";

// mirror Prisma enums
export const ChargeTypeEnum = z.enum([
  "EXTERNAL_CHARGE",
  "GOVERNMENT_FEE",
  "SERVICE_FEE",
]);

export const ChargeBearerEnum = z.enum(["CLIENT", "FIRM"]);

export const ChargeStatusEnum = z.enum(["NOT_PAID", "PAID", "WRITTEN_OFF"]);

// ---------- CREATE (POST) ----------

export const createTaskChargeSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),

    amount: z
      .number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number",
      })
      .positive("Amount must be > 0"),

    charge_type: ChargeTypeEnum,
    bearer: ChargeBearerEnum,
    status: ChargeStatusEnum.default("NOT_PAID"),

    remark: z.string().max(2000, "Remark too long").optional().nullable(),
  }),
  params: z.object({
    task_id: z.string().uuid("Invalid task id"),
  }),
});

// ---------- UPDATE (PATCH) ----------

export const updateTaskChargeSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, "Title cannot be empty").max(200).optional(),

      amount: z.number().positive("Amount must be > 0").optional(),

      charge_type: ChargeTypeEnum.optional(),
      bearer: ChargeBearerEnum.optional(),
      status: ChargeStatusEnum.optional(),

      remark: z.string().max(2000).nullable().optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one field must be provided"
    ),

  params: z.object({
    id: z.string().uuid("Invalid charge id"),
  }),
});

// ---------- DELETE ----------

export const deleteTaskChargeSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid charge id"),
  }),
});

// ---------- LIST (GET) ----------

export const listTaskChargesSchema = z.object({
  params: z.object({
    task_id: z.string().uuid("Invalid task id"),
  }),
});

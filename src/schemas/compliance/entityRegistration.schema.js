import { z } from "zod";

export const IndianStateEnum = z.enum([
  "ANDHRA_PRADESH",
  "ARUNACHAL_PRADESH",
  "ASSAM",
  "BIHAR",
  "CHHATTISGARH",
  "GOA",
  "GUJARAT",
  "HARYANA",
  "HIMACHAL_PRADESH",
  "JHARKHAND",
  "KARNATAKA",
  "KERALA",
  "MADHYA_PRADESH",
  "MAHARASHTRA",
  "MANIPUR",
  "MEGHALAYA",
  "MIZORAM",
  "NAGALAND",
  "ODISHA",
  "PUNJAB",
  "RAJASTHAN",
  "SIKKIM",
  "TAMIL_NADU",
  "TELANGANA",
  "TRIPURA",
  "UTTAR_PRADESH",
  "UTTARAKHAND",
  "WEST_BENGAL",
  "ANDAMAN_AND_NICOBAR_ISLANDS",
  "CHANDIGARH",
  "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU",
  "DELHI",
  "JAMMU_AND_KASHMIR",
  "LADAKH",
  "LAKSHADWEEP",
  "PUDUCHERRY",
]);

export const EntityRegistrationStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
]);

export const EntityRegistrationCreateSchema = z
  .object({
    entity_id: z.string().uuid(),
    registration_type_id: z.string().uuid(),
    registration_number: z.string().min(1).max(100).trim(),
    state: IndianStateEnum,
    effective_from: z.coerce.date().optional().nullable(),
    effective_to: z.coerce.date().optional().nullable(),
    status: EntityRegistrationStatusEnum.default("INACTIVE"),
    is_primary: z.boolean().default(false),
  })
  .refine(
    (data) =>
      !data.effective_to ||
      !data.effective_from ||
      data.effective_to >= data.effective_from,
    {
      message: "Effective to must be after effective from",
      path: ["effective_to"],
    }
  );

export const EntityRegistrationUpdateSchema = z
  .object({
    registration_type_id: z.string().uuid().optional(),

    registration_number: z.string().min(1).max(100).trim().optional(),

    state: IndianStateEnum.optional(),

    effective_from: z.coerce.date().optional().nullable(),
    effective_to: z.coerce.date().optional().nullable(),

    status: EntityRegistrationStatusEnum.optional(),

    is_primary: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.effective_to ||
      !data.effective_from ||
      data.effective_to >= data.effective_from,
    {
      message: "Effective to must be after effective from",
      path: ["effective_to"],
    }
  );

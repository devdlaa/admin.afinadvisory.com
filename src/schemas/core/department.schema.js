import { z } from "zod";
export const DepartmentCreateSchema = z.object({
  name: z.string().min(1).max(100).trim()
});

export const DepartmentUpdateSchema = DepartmentCreateSchema;
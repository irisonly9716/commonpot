import { z } from "zod";

/** `2026-11`: a calendar month. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2026-11.");

export const setBudgetSchema = z.object({
  categoryId: z.uuid("Choose a category."),
  limitCents: z
    .number()
    .int("The limit must be a whole number of cents.")
    .positive("The limit must be more than 0."),
  month: monthSchema,
});

export const budgetQuerySchema = z.object({ month: monthSchema.optional() });

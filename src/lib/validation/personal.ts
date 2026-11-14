import { z } from "zod";

import { expenseFormSchema } from "@/lib/validation/expenses";

/** A calendar month, YYYY-MM. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month in the YYYY-MM format");

const description = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(200, "Description must be 200 characters or fewer");

const category = z
  .string()
  .trim()
  .min(1, "Category is required")
  .max(50, "Category must be 50 characters or fewer");

/** Body of POST /api/v1/personal-expenses and PATCH .../{expenseId} (US10). */
export const personalExpenseSchema = z.object({
  amountCents: z.number().int().positive(),
  description,
  category,
  expenseDate: z.iso.date(),
});

export type PersonalExpenseInput = z.infer<typeof personalExpenseSchema>;

/** The form on My spending. The amount is text and is checked like a group expense's. */
export const personalExpenseFormSchema = z.object({
  amount: expenseFormSchema.shape.amount,
  description,
  category,
  expenseDate: z.iso.date("Choose a date"),
});

export type PersonalExpenseFormInput = z.input<
  typeof personalExpenseFormSchema
>;

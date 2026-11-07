import { z } from "zod";

const expenseShareSchema = z.object({
  userId: z.uuid(),
  amountCents: z.number().int().nonnegative(),
});

export const expenseCreateSchema = z
  .object({
    amountCents: z.number().int().positive(),
    description: z.string().trim().min(1, "Description is required"),
    categoryId: z.uuid().nullable(),
    expenseDate: z.iso.date(),
    paidBy: z.uuid(),
    shares: z.array(expenseShareSchema).min(1),
  })
  .superRefine((expense, context) => {
    const shareTotal = expense.shares.reduce(
      (total, share) => total + share.amountCents,
      0,
    );
    if (shareTotal !== expense.amountCents) {
      context.addIssue({
        code: "custom",
        message: "Share amounts must equal the expense amount",
        path: ["shares"],
      });
    }

    const userIds = new Set(expense.shares.map((share) => share.userId));
    if (userIds.size !== expense.shares.length) {
      context.addIssue({
        code: "custom",
        message: "Each member can appear only once",
        path: ["shares"],
      });
    }
  });

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

import { z } from "zod";

const uuidSchema = z.uuid();

export const expenseInputSchema = z
  .object({
    amountCents: z.number().int().positive().max(2_147_483_647),
    description: z.string().trim().min(1).max(200),
    category: z.string().trim().min(1).max(40),
    expenseDate: z.iso.date(),
    paidByUserId: uuidSchema,
    splitType: z.enum(["equal", "exact"]),
    participantUserIds: z.array(uuidSchema).min(1),
    exactShares: z
      .array(
        z.object({
          userId: uuidSchema,
          amountCents: z.number().int().nonnegative().max(2_147_483_647),
        }),
      )
      .optional(),
  })
  .strict()
  .superRefine((expense, context) => {
    const participants = new Set(expense.participantUserIds);
    if (participants.size !== expense.participantUserIds.length) {
      context.addIssue({
        code: "custom",
        message: "A member can only be selected once.",
        path: ["participantUserIds"],
      });
    }

    if (expense.splitType !== "exact") {
      if (expense.exactShares !== undefined) {
        context.addIssue({
          code: "custom",
          message: "Exact shares are only allowed for an exact split.",
          path: ["exactShares"],
        });
      }
      return;
    }

    if (!expense.exactShares) {
      context.addIssue({
        code: "custom",
        message: "Enter an amount for each selected member.",
        path: ["exactShares"],
      });
      return;
    }

    const exactShareIds = new Set(expense.exactShares.map((share) => share.userId));
    if (
      exactShareIds.size !== expense.exactShares.length ||
      exactShareIds.size !== participants.size ||
      [...participants].some((userId) => !exactShareIds.has(userId))
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter exactly one share for every selected member.",
        path: ["exactShares"],
      });
    }

    const assignedCents = expense.exactShares.reduce(
      (total, share) => total + share.amountCents,
      0,
    );
    if (assignedCents !== expense.amountCents) {
      context.addIssue({
        code: "custom",
        message: `Shares must add up to the expense total. Difference: ${expense.amountCents - assignedCents} cents.`,
        path: ["exactShares"],
      });
    }
  });

export const groupExpensesResponseSchema = z.object({
  group: z.object({
    name: z.string(),
    currency: z.string().length(3),
  }),
  currentUserId: uuidSchema,
  members: z.array(
    z.object({
      userId: uuidSchema,
      displayName: z.string(),
    }),
  ),
  expenses: z.array(
    z.object({
      id: uuidSchema,
      description: z.string(),
      category: z.string(),
      amountCents: z.number().int(),
      expenseDate: z.iso.date(),
      splitType: z.enum(["equal", "exact"]),
      paidByUserId: uuidSchema,
      createdAt: z.iso.datetime(),
      shares: z.array(
        z.object({
          userId: uuidSchema,
          amountCents: z.number().int(),
        }),
      ),
    }),
  ),
});

export const createExpenseResponseSchema = z.object({
  expenseId: uuidSchema,
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type GroupExpensesResponse = z.infer<typeof groupExpensesResponseSchema>;

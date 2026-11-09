import { describe, expect, it } from "vitest";

import { expenseCreateSchema } from "../../src/lib/validation/expenses";

describe("US3 expense validation", () => {
  it("accepts integer cents and exact shares that total the amount", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 12000,
      description: "Internet",
      categoryId: null,
      expenseDate: "2026-11-07",
      paidBy: "11111111-1111-4111-8111-111111111111",
      shares: [
        {
          userId: "11111111-1111-4111-8111-111111111111",
          amountCents: 6000,
        },
        {
          userId: "22222222-2222-4222-8222-222222222222",
          amountCents: 6000,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-positive amounts, missing descriptions, and mismatched shares", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 0,
      description: "",
      categoryId: null,
      expenseDate: "",
      paidBy: "not-a-uuid",
      shares: [],
    });

    expect(result.success).toBe(false);
  });

  it("limits descriptions to 200 characters", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 100,
      description: "x".repeat(201),
      categoryId: null,
      expenseDate: "2026-11-07",
      paidBy: "11111111-1111-4111-8111-111111111111",
      shares: [
        {
          userId: "11111111-1111-4111-8111-111111111111",
          amountCents: 100,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  monthSchema,
  personalExpenseFormSchema,
  personalExpenseSchema,
} from "@/lib/validation/personal";

const valid = {
  amountCents: 1250,
  description: "Coffee beans",
  category: "Groceries",
  expenseDate: "2026-11-14",
};

describe("US10 my personal ledger: validation", () => {
  it("accepts a personal expense and trims its text", () => {
    expect(
      personalExpenseSchema.parse({
        ...valid,
        description: "  Coffee beans ",
        category: " Groceries ",
      }),
    ).toEqual(valid);
  });

  it("needs a positive whole number of cents", () => {
    for (const amountCents of [0, -5, 12.5, "1250"]) {
      expect(
        personalExpenseSchema.safeParse({ ...valid, amountCents }).success,
      ).toBe(false);
    }
  });

  it("needs a description, a category and a real date", () => {
    expect(
      personalExpenseSchema.safeParse({ ...valid, description: "   " }).success,
    ).toBe(false);
    expect(
      personalExpenseSchema.safeParse({ ...valid, category: "" }).success,
    ).toBe(false);
    expect(
      personalExpenseSchema.safeParse({ ...valid, category: "x".repeat(51) })
        .success,
    ).toBe(false);
    expect(
      personalExpenseSchema.safeParse({ ...valid, expenseDate: "2026-02-30" })
        .success,
    ).toBe(false);
  });

  it("checks the form's amount the same way as the group expense form", () => {
    const form = {
      amount: "12.50",
      description: "Coffee beans",
      category: "Groceries",
      expenseDate: "2026-11-14",
    };
    expect(personalExpenseFormSchema.safeParse(form).success).toBe(true);
    for (const amount of ["0", "12.345", "abc", ""]) {
      expect(
        personalExpenseFormSchema.safeParse({ ...form, amount }).success,
      ).toBe(false);
    }
  });

  it("accepts months written as YYYY-MM only", () => {
    expect(monthSchema.safeParse("2026-11").success).toBe(true);
    for (const month of ["2026-13", "2026-1", "26-11", "2026-11-01", ""]) {
      expect(monthSchema.safeParse(month).success).toBe(false);
    }
  });
});

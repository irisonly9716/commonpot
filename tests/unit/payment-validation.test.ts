import { describe, expect, it } from "vitest";

import {
  paymentCreateSchema,
  paymentFormSchema,
} from "@/lib/validation/payments";

const you = "11111111-1111-4111-8111-111111111111";
const alex = "22222222-2222-4222-8222-222222222222";

describe("US5 payment validation", () => {
  it("accepts a payment between two different people in integer cents", () => {
    const result = paymentCreateSchema.safeParse({
      paidBy: you,
      paidTo: alex,
      amountCents: 4000,
      paymentDate: "2026-11-09",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.note).toBe("");
  });

  it("rejects paying yourself, non-positive amounts and long notes", () => {
    const base = {
      paidBy: you,
      paidTo: alex,
      amountCents: 4000,
      paymentDate: "2026-11-09",
    };
    expect(
      paymentCreateSchema.safeParse({ ...base, paidTo: you }).success,
    ).toBe(false);
    expect(
      paymentCreateSchema.safeParse({ ...base, amountCents: 0 }).success,
    ).toBe(false);
    expect(
      paymentCreateSchema.safeParse({ ...base, amountCents: 10.5 }).success,
    ).toBe(false);
    expect(
      paymentCreateSchema.safeParse({ ...base, note: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("gives readable form errors", () => {
    const result = paymentFormSchema.safeParse({
      paidBy: you,
      paidTo: you,
      amount: "1.234",
      paymentDate: "2026-11-09",
    });
    expect(result.success).toBe(false);
    const messages = result.success
      ? []
      : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain(
      "Enter an amount greater than $0 with at most 2 decimals",
    );
    expect(messages).toContain("Choose two different people");
  });
});

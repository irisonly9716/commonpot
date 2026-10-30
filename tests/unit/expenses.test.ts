import { describe, expect, it } from "vitest";
import {
  parseAmountToCents,
  splitEqually,
} from "../../src/lib/domain/expenses";
import { expenseInputSchema } from "../../src/lib/validation/expenses";

const members = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];

describe("US3 log and split an expense", () => {
  it("gives leftover cents to members one at a time", () => {
    expect(splitEqually(1000, members)).toEqual([
      { userId: members[0], amountCents: 334 },
      { userId: members[1], amountCents: 333 },
      { userId: members[2], amountCents: 333 },
    ]);
  });

  it("keeps all equal shares in integer cents and sums to the expense", () => {
    const shares = splitEqually(1, members);

    expect(shares.map((share) => share.amountCents)).toEqual([1, 0, 0]);
    expect(shares.reduce((sum, share) => sum + share.amountCents, 0)).toBe(1);
  });

  it("rejects a zero amount or an empty participant list", () => {
    expect(() => splitEqually(0, members)).toThrow(RangeError);
    expect(() => splitEqually(100, [])).toThrow(RangeError);
  });

  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.05", 1205],
    ["0.01", 1],
  ])("parses %s as integer cents", (amount, expected) => {
    expect(parseAmountToCents(amount)).toBe(expected);
  });

  it.each(["", "1.234", "-1.00", "1,000.00", "1."])(
    "rejects invalid amount %s",
    (amount) => {
      expect(parseAmountToCents(amount)).toBeNull();
    },
  );

  it("accepts an exact split that sums to the amount", () => {
    const result = expenseInputSchema.safeParse({
      amountCents: 1000,
      description: "Groceries",
      category: "Food",
      expenseDate: "2026-10-30",
      paidByUserId: members[0],
      splitType: "exact",
      participantUserIds: members.slice(0, 2),
      exactShares: [
        { userId: members[0], amountCents: 600 },
        { userId: members[1], amountCents: 400 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects exact shares that do not sum to the amount", () => {
    const result = expenseInputSchema.safeParse({
      amountCents: 1000,
      description: "Groceries",
      category: "Food",
      expenseDate: "2026-10-30",
      paidByUserId: members[0],
      splitType: "exact",
      participantUserIds: members.slice(0, 2),
      exactShares: [
        { userId: members[0], amountCents: 600 },
        { userId: members[1], amountCents: 300 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Difference: 100 cents");
    }
  });

  it("rejects exact shares for a different participant set", () => {
    const result = expenseInputSchema.safeParse({
      amountCents: 1000,
      description: "Groceries",
      category: "Food",
      expenseDate: "2026-10-30",
      paidByUserId: members[0],
      splitType: "exact",
      participantUserIds: members.slice(0, 2),
      exactShares: [
        { userId: members[0], amountCents: 500 },
        { userId: members[2], amountCents: 500 },
      ],
    });

    expect(result.success).toBe(false);
  });
});

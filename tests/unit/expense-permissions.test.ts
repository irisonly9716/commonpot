import { describe, expect, it } from "vitest";

import {
  canDeleteExpense,
  canEditExpense,
  deletionAlertsCreator,
  detectSplitMode,
} from "@/lib/domain/expenses";

const creator = "22222222-2222-4222-8222-222222222222";
const other = "12121212-1212-4212-8212-121212121212";
const expense = { createdBy: creator };

describe("US6 fix mistakes", () => {
  it("lets only the person who logged an expense edit it", () => {
    expect(canEditExpense({ userId: creator, role: "member" }, expense)).toBe(
      true,
    );
    expect(canEditExpense({ userId: other, role: "member" }, expense)).toBe(
      false,
    );
    expect(canEditExpense({ userId: other, role: "admin" }, expense)).toBe(
      false,
    );
  });

  it("lets the person who logged it or a group admin delete it", () => {
    expect(canDeleteExpense({ userId: creator, role: "member" }, expense)).toBe(
      true,
    );
    expect(canDeleteExpense({ userId: other, role: "admin" }, expense)).toBe(
      true,
    );
    expect(canDeleteExpense({ userId: other, role: "member" }, expense)).toBe(
      false,
    );
  });

  it("alerts the creator only when someone else deletes their expense", () => {
    expect(
      deletionAlertsCreator({ userId: other, role: "admin" }, expense),
    ).toBe(true);
    expect(
      deletionAlertsCreator({ userId: creator, role: "admin" }, expense),
    ).toBe(false);
  });

  it("reopens an expense split equally as an equal split", () => {
    // The leftover cent goes to the lowest user id, as splitEqually does.
    const shares = [
      { userId: other, amountCents: 3333 },
      { userId: creator, amountCents: 3333 },
      { userId: "11111111-1111-4111-8111-111111111111", amountCents: 3334 },
    ];

    expect(detectSplitMode(10000, shares)).toBe("equal");
  });

  it("reopens an expense with any other shares as an exact split", () => {
    expect(
      detectSplitMode(10000, [
        { userId: other, amountCents: 7000 },
        { userId: creator, amountCents: 3000 },
      ]),
    ).toBe("exact");
    // Equal amounts, but the leftover cent went to the wrong member.
    expect(
      detectSplitMode(10001, [
        { userId: other, amountCents: 5000 },
        { userId: creator, amountCents: 5001 },
      ]),
    ).toBe("exact");
  });
});

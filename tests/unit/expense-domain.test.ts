import { describe, expect, it } from "vitest";

import {
  checkExactSplit,
  parseAmountToCents,
  splitEqually,
} from "../../src/lib/domain/expenses";

describe("US3 expense domain", () => {
  it("parses positive amounts with at most two decimal places", () => {
    expect(parseAmountToCents("84.21")).toBe(8421);
    expect(parseAmountToCents("5")).toBe(500);
    expect(() => parseAmountToCents("0")).toThrow();
    expect(() => parseAmountToCents("1.234")).toThrow();
  });

  it("gives equal-split leftover cents to members sorted by user id", () => {
    expect(splitEqually(8421, ["you", "alex", "sam", "mia"])).toEqual([
      { userId: "you", amountCents: 2105 },
      { userId: "alex", amountCents: 2106 },
      { userId: "sam", amountCents: 2105 },
      { userId: "mia", amountCents: 2105 },
    ]);
    expect(splitEqually(1002, ["c", "a", "b", "d"])).toEqual([
      { userId: "c", amountCents: 250 },
      { userId: "a", amountCents: 251 },
      { userId: "b", amountCents: 251 },
      { userId: "d", amountCents: 250 },
    ]);
  });

  it("splits the same way whatever order the members are listed in", () => {
    const byUser = (shares: Array<{ userId: string; amountCents: number }>) =>
      Object.fromEntries(shares.map((s) => [s.userId, s.amountCents]));
    expect(byUser(splitEqually(1001, ["b", "c", "a"]))).toEqual(
      byUser(splitEqually(1001, ["a", "b", "c"])),
    );
  });

  it("reports the difference for an exact split", () => {
    expect(checkExactSplit(12000, [4000, 4000, 3600])).toEqual({
      differenceCents: 400,
      isValid: false,
    });
    expect(checkExactSplit(12000, [4000, 4000, 4000])).toEqual({
      differenceCents: 0,
      isValid: true,
    });
  });
});

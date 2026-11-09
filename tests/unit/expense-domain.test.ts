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

  it("gives equal-split leftover cents to members in order", () => {
    expect(splitEqually(8421, ["you", "alex", "sam", "mia"])).toEqual([
      { userId: "you", amountCents: 2106 },
      { userId: "alex", amountCents: 2105 },
      { userId: "sam", amountCents: 2105 },
      { userId: "mia", amountCents: 2105 },
    ]);
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

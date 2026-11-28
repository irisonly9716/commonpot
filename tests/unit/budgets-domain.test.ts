import { describe, expect, it } from "vitest";

import {
  budgetProgress,
  newThresholds,
  thresholdsReached,
} from "@/lib/domain/budgets";

describe("US7 budget progress", () => {
  it("shows spent, limit, amount left and whole percent used", () => {
    expect(budgetProgress(50_000, 12_550)).toEqual({
      limitCents: 50_000,
      spentCents: 12_550,
      leftCents: 37_450,
      percent: 25,
      status: "ok",
    });
  });

  it("rounds the percent down so 79.9% is not shown as 80%", () => {
    expect(budgetProgress(10_000, 7_999).percent).toBe(79);
    expect(budgetProgress(10_000, 7_999).status).toBe("ok");
  });

  it("warns from 80% and goes over from 100%", () => {
    expect(budgetProgress(10_000, 8_000).status).toBe("warning");
    expect(budgetProgress(10_000, 9_999).status).toBe("warning");
    expect(budgetProgress(10_000, 10_000).status).toBe("over");
  });

  it("reports a negative amount left when the budget is overspent", () => {
    const progress = budgetProgress(10_000, 12_500);
    expect(progress.leftCents).toBe(-2_500);
    expect(progress.percent).toBe(125);
    expect(progress.status).toBe("over");
  });

  it("rejects a limit that is not a positive whole number of cents", () => {
    expect(() => budgetProgress(0, 100)).toThrow();
    expect(() => budgetProgress(-5, 100)).toThrow();
    expect(() => budgetProgress(10.5, 100)).toThrow();
  });
});

describe("US7 alert thresholds", () => {
  it("reaches nothing below 80%", () => {
    expect(thresholdsReached(10_000, 7_999)).toEqual([]);
  });

  it("reaches 80 exactly at 80% and both at 100%", () => {
    expect(thresholdsReached(10_000, 8_000)).toEqual([80]);
    expect(thresholdsReached(10_000, 10_000)).toEqual([80, 100]);
    expect(thresholdsReached(10_000, 15_000)).toEqual([80, 100]);
  });

  it("compares in whole cents with no floating point error", () => {
    // 0.8 * 29_999 is not exactly 23_999.2 in floating point, so test the edge.
    expect(thresholdsReached(29_999, 23_999)).toEqual([]);
    expect(thresholdsReached(29_999, 24_000)).toEqual([80]);
  });

  it("only reports a threshold once per month", () => {
    expect(newThresholds([80], [])).toEqual([80]);
    expect(newThresholds([80], [80])).toEqual([]);
    expect(newThresholds([80, 100], [80])).toEqual([100]);
    expect(newThresholds([80, 100], [80, 100])).toEqual([]);
  });
});

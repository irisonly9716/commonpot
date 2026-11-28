/** Budget progress and alert thresholds (US7). Pure: amounts are integer cents. */

export const ALERT_THRESHOLDS = [80, 100] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

export type BudgetStatus = "ok" | "warning" | "over";

export type BudgetProgress = {
  limitCents: number;
  spentCents: number;
  /** Negative when the budget is overspent. */
  leftCents: number;
  /** Whole-number percent of the limit, rounded down. Can exceed 100. */
  percent: number;
  status: BudgetStatus;
};

function assertLimit(limitCents: number): void {
  if (!Number.isInteger(limitCents) || limitCents <= 0) {
    throw new Error("A budget limit must be a positive whole number of cents");
  }
}

/** The thresholds spending has reached: all whole-cent comparisons. */
export function thresholdsReached(
  limitCents: number,
  spentCents: number,
): AlertThreshold[] {
  assertLimit(limitCents);
  return ALERT_THRESHOLDS.filter(
    (threshold) => spentCents * 100 >= limitCents * threshold,
  );
}

function statusFor(reached: readonly AlertThreshold[]): BudgetStatus {
  if (reached.includes(100)) return "over";
  return reached.length > 0 ? "warning" : "ok";
}

export function budgetProgress(
  limitCents: number,
  spentCents: number,
): BudgetProgress {
  assertLimit(limitCents);
  return {
    limitCents,
    spentCents,
    leftCents: limitCents - spentCents,
    percent: Math.floor((spentCents * 100) / limitCents),
    status: statusFor(thresholdsReached(limitCents, spentCents)),
  };
}

/** Thresholds reached that were not already alerted this month. */
export function newThresholds(
  reached: readonly AlertThreshold[],
  alreadyAlerted: readonly AlertThreshold[],
): AlertThreshold[] {
  return reached.filter((threshold) => !alreadyAlerted.includes(threshold));
}

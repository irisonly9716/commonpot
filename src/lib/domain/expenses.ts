export type ExpenseShare = {
  userId: string;
  amountCents: number;
};

export type ExactSplitResult = {
  differenceCents: number;
  isValid: boolean;
};

export function parseAmountToCents(amount: string): number {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error(
      "Amount must be a positive number with at most two decimals",
    );
  }

  const [whole, fraction = ""] = amount.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return cents;
}

export function splitEqually(
  amountCents: number,
  memberIds: readonly string[],
): ExpenseShare[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (memberIds.length === 0) {
    throw new Error("At least one member is required");
  }

  const baseCents = Math.floor(amountCents / memberIds.length);
  const leftoverCents = amountCents % memberIds.length;
  // Leftover cents go one at a time to members sorted by user id, so the
  // result doesn't depend on the order the members were listed in.
  const leftoverRank = new Map(
    [...memberIds].sort().map((userId, rank) => [userId, rank]),
  );

  return memberIds.map((userId) => ({
    userId,
    amountCents:
      baseCents + ((leftoverRank.get(userId) ?? 0) < leftoverCents ? 1 : 0),
  }));
}

export function checkExactSplit(
  amountCents: number,
  shareAmountsCents: readonly number[],
): ExactSplitResult {
  const differenceCents =
    amountCents - shareAmountsCents.reduce((total, share) => total + share, 0);

  return {
    differenceCents,
    isValid: differenceCents === 0,
  };
}

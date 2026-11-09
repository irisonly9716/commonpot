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

export type GroupRole = "admin" | "member";

export type ExpenseActor = {
  userId: string;
  role: GroupRole;
};

type LoggedExpense = {
  createdBy: string;
};

/** Only the person who logged an expense can edit it (US6). */
export function canEditExpense(
  actor: ExpenseActor,
  expense: LoggedExpense,
): boolean {
  return actor.userId === expense.createdBy;
}

/** The person who logged an expense or any group admin can delete it (US6). */
export function canDeleteExpense(
  actor: ExpenseActor,
  expense: LoggedExpense,
): boolean {
  return actor.userId === expense.createdBy || actor.role === "admin";
}

/** Deleting someone else's expense sends them an in-app alert. */
export function deletionAlertsCreator(
  actor: ExpenseActor,
  expense: LoggedExpense,
): boolean {
  return actor.userId !== expense.createdBy;
}

/**
 * Which split mode to reopen an expense in: "equal" when its shares are exactly
 * what splitEqually gives for the same members, "exact" otherwise.
 */
export function detectSplitMode(
  amountCents: number,
  shares: readonly ExpenseShare[],
): "equal" | "exact" {
  if (shares.length === 0) return "exact";
  const equal = splitEqually(
    amountCents,
    shares.map((share) => share.userId),
  );
  return equal.every(
    (share, index) => share.amountCents === shares[index].amountCents,
  )
    ? "equal"
    : "exact";
}

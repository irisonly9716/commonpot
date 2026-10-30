export type ExpenseShare = {
  userId: string;
  amountCents: number;
};

export function splitEqually(
  amountCents: number,
  memberIds: readonly string[],
): ExpenseShare[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new RangeError("The expense amount must be a positive number of cents.");
  }
  if (memberIds.length === 0 || new Set(memberIds).size !== memberIds.length) {
    throw new RangeError("Choose at least one unique group member.");
  }

  const baseShare = Math.floor(amountCents / memberIds.length);
  const leftoverCents = amountCents % memberIds.length;

  return memberIds.map((userId, index) => ({
    userId,
    amountCents: baseShare + (index < leftoverCents ? 1 : 0),
  }));
}

export function parseAmountToCents(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const wholeAmount = Number(match[1]);
  const fractionalAmount = Number((match[2] ?? "").padEnd(2, "0"));
  const amountCents = wholeAmount * 100 + fractionalAmount;

  return Number.isSafeInteger(amountCents) ? amountCents : null;
}

export function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

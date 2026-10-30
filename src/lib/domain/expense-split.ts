export type SplitType = "equal" | "exact";

export type ExpenseShare = {
  memberId: string;
  amountCents: number;
};

export type CreateExpenseInput = {
  amount: string;
  description: string;
  category: string;
  date: string;
  paidBy: string;
  sharedBy: string[];
  splitType: SplitType;
  exactAmounts?: Record<string, string>;
};

export type Expense = {
  amountCents: number;
  description: string;
  category: string;
  date: string;
  paidBy: string;
  shares: ExpenseShare[];
};

export type ExactSplitValidation =
  | { valid: true }
  | { valid: false; differenceCents: number };

function assertMembers(memberIds: string[]): void {
  if (memberIds.length === 0 || memberIds.some((memberId) => memberId.length === 0)) {
    throw new Error("At least one member must share the expense");
  }

  if (new Set(memberIds).size !== memberIds.length) {
    throw new Error("Shared members must be unique");
  }
}

function parseAmount(amount: string, fieldName: string): number {
  const normalizedAmount = amount.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalizedAmount)) {
    throw new Error(
      `${fieldName} must be greater than 0 and have at most 2 decimals`,
    );
  }

  const [whole, fraction = ""] = normalizedAmount.split(".");
  const amountCents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error(
      `${fieldName} must be greater than 0 and have at most 2 decimals`,
    );
  }

  return amountCents;
}

function assertDate(date: string): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match === null) {
    throw new Error("Date is required and must be YYYY-MM-DD");
  }

  const [, year, month, day] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day)
  ) {
    throw new Error("Date is required and must be YYYY-MM-DD");
  }
}

export function splitEqually(
  totalCents: number,
  memberIds: string[],
): ExpenseShare[] {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Total must be a positive number of cents");
  }
  assertMembers(memberIds);

  const baseShare = Math.floor(totalCents / memberIds.length);
  const leftoverCents = totalCents % memberIds.length;
  return memberIds.map((memberId, index) => ({
    memberId,
    amountCents: baseShare + (index < leftoverCents ? 1 : 0),
  }));
}

export function validateExactSplit(
  totalCents: number,
  sharesCents: number[],
): ExactSplitValidation {
  const differenceCents = totalCents - sharesCents.reduce((sum, share) => sum + share, 0);
  return differenceCents === 0
    ? { valid: true }
    : { valid: false, differenceCents };
}

export function createExpense(input: CreateExpenseInput): Expense {
  const amountCents = parseAmount(input.amount, "Amount");
  if (input.description.trim().length === 0) {
    throw new Error("Description is required");
  }
  if (input.category.trim().length === 0) {
    throw new Error("Category is required");
  }
  assertDate(input.date);
  if (input.paidBy.trim().length === 0) {
    throw new Error("Paid by is required");
  }
  assertMembers(input.sharedBy);
  if (!input.sharedBy.includes(input.paidBy)) {
    throw new Error("The payer must be one of the members sharing the expense");
  }

  let shares: ExpenseShare[];
  if (input.splitType === "equal") {
    shares = splitEqually(amountCents, input.sharedBy);
  } else {
    if (input.exactAmounts === undefined) {
      throw new Error("Exact amounts are required for an exact split");
    }

    const sharedMemberIds = new Set(input.sharedBy);
    const exactMemberIds = Object.keys(input.exactAmounts);
    if (
      exactMemberIds.length !== input.sharedBy.length ||
      exactMemberIds.some((memberId) => !sharedMemberIds.has(memberId))
    ) {
      throw new Error("Exact amounts must be provided for each sharing member");
    }

    shares = input.sharedBy.map((memberId) => ({
      memberId,
      amountCents: parseAmount(
        input.exactAmounts?.[memberId] ?? "",
        `Exact amount for ${memberId}`,
      ),
    }));
    const validation = validateExactSplit(
      amountCents,
      shares.map((share) => share.amountCents),
    );
    if (!validation.valid) {
      throw new Error(
        `Exact amounts must add up to the total (difference: ${validation.differenceCents} cents)`,
      );
    }
  }

  return {
    amountCents,
    description: input.description.trim(),
    category: input.category.trim(),
    date: input.date,
    paidBy: input.paidBy,
    shares,
  };
}

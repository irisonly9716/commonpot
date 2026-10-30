import { randomUUID } from "node:crypto";

export class ExpenseValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ExpenseValidationError";
    this.code = code;
  }
}

function validationError(message, code) {
  return new ExpenseValidationError(message, code);
}

function toCents(value, fieldName) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw validationError(`${fieldName} must be a monetary amount.`, "INVALID_AMOUNT");
  }

  const text = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    throw validationError(`${fieldName} must have at most two decimal places.`, "INVALID_AMOUNT");
  }

  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw validationError(`${fieldName} is too large.`, "INVALID_AMOUNT");
  }
  return cents;
}

function assertMemberIds(group, memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    throw validationError("At least one member must receive the expense.", "INVALID_SPLIT");
  }

  if (new Set(memberIds).size !== memberIds.length) {
    throw validationError("A member can only appear once in a split.", "INVALID_SPLIT");
  }

  const knownMembers = new Set(group.members.map((member) => member.id));
  const unknownMember = memberIds.find((memberId) => !knownMembers.has(memberId));
  if (unknownMember) {
    throw validationError(`Member "${unknownMember}" is not in this group.`, "UNKNOWN_MEMBER");
  }
}

function equalShares(totalCents, memberIds) {
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents % memberIds.length;
  return Object.fromEntries(
    memberIds.map((memberId, index) => [memberId, base + (index < remainder ? 1 : 0)]),
  );
}

function exactShares(totalCents, memberIds, amounts) {
  if (!amounts || typeof amounts !== "object" || Array.isArray(amounts)) {
    throw validationError("Exact splits must provide amounts by member ID.", "INVALID_SPLIT");
  }

  const amountIds = Object.keys(amounts).sort();
  const expectedIds = [...memberIds].sort();
  if (
    amountIds.length !== expectedIds.length ||
    amountIds.some((memberId, index) => memberId !== expectedIds[index])
  ) {
    throw validationError("Exact splits must include each participating member exactly once.", "INVALID_SPLIT");
  }

  const shares = Object.fromEntries(
    memberIds.map((memberId) => {
      const cents = toCents(amounts[memberId], `Amount for ${memberId}`);
      return [memberId, cents];
    }),
  );
  if (Object.values(shares).some((cents) => cents < 0)) {
    throw validationError("Split amounts cannot be negative.", "INVALID_SPLIT");
  }
  if (Object.values(shares).reduce((sum, cents) => sum + cents, 0) !== totalCents) {
    throw validationError("Split amounts must add up to the expense total.", "INVALID_SPLIT");
  }
  return shares;
}

/**
 * Adds an expense to a group and returns the persisted expense.
 *
 * Amounts are represented in cents in the returned value. Equal splits assign
 * any leftover cent(s) to the first members in the supplied member order.
 */
export function addExpense(group, input) {
  if (!group || !Array.isArray(group.members) || !Array.isArray(group.expenses)) {
    throw new TypeError("group must contain members and expenses arrays.");
  }
  if (!input || typeof input !== "object") {
    throw validationError("Expense details are required.", "INVALID_EXPENSE");
  }

  const payer = group.members.find((member) => member.id === input.payerId);
  if (!payer) {
    throw validationError("Only a member of the group can add an expense.", "UNKNOWN_MEMBER");
  }

  const totalCents = toCents(input.amount, "Expense amount");
  if (totalCents <= 0) {
    throw validationError("Expense amount must be greater than zero.", "INVALID_AMOUNT");
  }

  const memberIds = input.memberIds ?? group.members.map((member) => member.id);
  assertMemberIds(group, memberIds);

  const shares =
    input.splitType === "exact"
      ? exactShares(totalCents, memberIds, input.amounts)
      : input.splitType === "equal" || input.splitType === undefined
        ? equalShares(totalCents, memberIds)
        : (() => {
            throw validationError('splitType must be "equal" or "exact".', "INVALID_SPLIT");
          })();

  const expense = {
    id: input.id ?? randomUUID(),
    description: input.description?.trim() || "Untitled expense",
    amountCents: totalCents,
    payerId: payer.id,
    splitType: input.splitType ?? "equal",
    shares,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  group.expenses.push(expense);
  return expense;
}

export type BalanceExpense = {
  id: string;
  description: string;
  expenseDate: string;
  paidBy: string;
  amountCents: number;
  shares: Array<{ userId: string; amountCents: number }>;
};

export type BalancePayment = {
  id: string;
  paidBy: string;
  paidTo: string;
  amountCents: number;
  paymentDate: string;
};

export type MemberBalance = {
  userId: string;
  balanceCents: number;
};

export type Settlement = {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
};

export type BreakdownItem = {
  kind: "expense" | "payment";
  id: string;
  date: string;
  description: string;
  effectCents: number;
};

export type BalanceDescription = {
  status: "owed" | "owes" | "settled";
  amountCents: number;
};

/**
 * A balance is what a member paid for expenses minus their shares, plus the
 * payments they made minus the payments they received. Positive means the
 * group owes them. Every expense's shares add up to its amount, so a group's
 * balances always add up to zero.
 */
export function computeBalances(
  memberIds: readonly string[],
  expenses: readonly BalanceExpense[],
  payments: readonly BalancePayment[],
): MemberBalance[] {
  const totals = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (userId: string, cents: number) =>
    totals.set(userId, (totals.get(userId) ?? 0) + cents);

  for (const expense of expenses) {
    add(expense.paidBy, expense.amountCents);
    for (const share of expense.shares) add(share.userId, -share.amountCents);
  }
  for (const payment of payments) {
    add(payment.paidBy, payment.amountCents);
    add(payment.paidTo, -payment.amountCents);
  }

  // Members first, in the order given; anyone who left but still appears in
  // the history follows, sorted by id.
  const members = new Set(memberIds);
  const formerMembers = [...totals.keys()]
    .filter((id) => !members.has(id))
    .sort();
  return [...memberIds, ...formerMembers].map((userId) => ({
    userId,
    balanceCents: totals.get(userId) ?? 0,
  }));
}

/**
 * Greedy settle-up: the member who owes the most pays the member who is owed
 * the most until one of them reaches zero. Each payment clears at least one
 * balance, so there are at most (members with a non-zero balance - 1) payments.
 */
export function suggestSettlements(
  balances: readonly MemberBalance[],
): Settlement[] {
  const byAmountThenId = (
    a: { userId: string; cents: number },
    b: { userId: string; cents: number },
  ) => b.cents - a.cents || a.userId.localeCompare(b.userId);

  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ userId: b.userId, cents: b.balanceCents }))
    .sort(byAmountThenId);
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ userId: b.userId, cents: -b.balanceCents }))
    .sort(byAmountThenId);

  const settlements: Settlement[] = [];
  let c = 0;
  let d = 0;
  while (c < creditors.length && d < debtors.length) {
    const amountCents = Math.min(creditors[c].cents, debtors[d].cents);
    settlements.push({
      fromUserId: debtors[d].userId,
      toUserId: creditors[c].userId,
      amountCents,
    });
    creditors[c].cents -= amountCents;
    debtors[d].cents -= amountCents;
    if (creditors[c].cents === 0) c += 1;
    if (debtors[d].cents === 0) d += 1;
  }
  return settlements;
}

/** The expenses and payments behind one member's balance, newest first. */
export function balanceBreakdown(
  userId: string,
  expenses: readonly BalanceExpense[],
  payments: readonly BalancePayment[],
): BreakdownItem[] {
  const items: BreakdownItem[] = [];

  for (const expense of expenses) {
    const paid = expense.paidBy === userId ? expense.amountCents : 0;
    const share = expense.shares.find((s) => s.userId === userId);
    if (!paid && !share) continue;
    items.push({
      kind: "expense",
      id: expense.id,
      date: expense.expenseDate,
      description: expense.description,
      effectCents: paid - (share?.amountCents ?? 0),
    });
  }
  for (const payment of payments) {
    if (payment.paidBy !== userId && payment.paidTo !== userId) continue;
    items.push({
      kind: "payment",
      id: payment.id,
      date: payment.paymentDate,
      description: "Payment",
      effectCents:
        payment.paidBy === userId ? payment.amountCents : -payment.amountCents,
    });
  }

  return items.sort(
    (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
  );
}

export function describeBalance(balanceCents: number): BalanceDescription {
  if (balanceCents > 0) return { status: "owed", amountCents: balanceCents };
  if (balanceCents < 0) return { status: "owes", amountCents: -balanceCents };
  return { status: "settled", amountCents: 0 };
}

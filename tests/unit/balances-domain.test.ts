import { describe, expect, it } from "vitest";

import {
  balanceBreakdown,
  computeBalances,
  describeBalance,
  suggestSettlements,
  type BalanceExpense,
  type BalancePayment,
  type MemberBalance,
} from "@/lib/domain/balances";

const expenses: BalanceExpense[] = [
  {
    id: "e1",
    description: "Groceries",
    expenseDate: "2026-11-01",
    paidBy: "you",
    amountCents: 9000,
    shares: [
      { userId: "you", amountCents: 3000 },
      { userId: "alex", amountCents: 3000 },
      { userId: "sam", amountCents: 3000 },
    ],
  },
  {
    id: "e2",
    description: "Internet",
    expenseDate: "2026-11-03",
    paidBy: "alex",
    amountCents: 6000,
    shares: [
      { userId: "alex", amountCents: 2000 },
      { userId: "sam", amountCents: 2000 },
      { userId: "mia", amountCents: 2000 },
    ],
  },
];

const payments: BalancePayment[] = [
  {
    id: "p1",
    paidBy: "sam",
    paidTo: "you",
    amountCents: 1000,
    paymentDate: "2026-11-05",
  },
];

function total(balances: MemberBalance[]): number {
  return balances.reduce((sum, balance) => sum + balance.balanceCents, 0);
}

function byUser(balances: MemberBalance[]): Record<string, number> {
  return Object.fromEntries(
    balances.map((balance) => [balance.userId, balance.balanceCents]),
  );
}

describe("US5 balances", () => {
  it("is what each member paid minus their shares, adjusted by payments", () => {
    const balances = computeBalances(
      ["you", "alex", "sam", "mia"],
      expenses,
      payments,
    );
    expect(byUser(balances)).toEqual({
      you: 5000,
      alex: 1000,
      sam: -4000,
      mia: -2000,
    });
  });

  it("adds up to exactly zero and keeps members who are settled up", () => {
    const balances = computeBalances(
      ["you", "alex", "sam", "mia", "lee"],
      expenses,
      payments,
    );
    expect(total(balances)).toBe(0);
    expect(byUser(balances).lee).toBe(0);
    expect(balances.map((balance) => balance.userId)).toEqual([
      "you",
      "alex",
      "sam",
      "mia",
      "lee",
    ]);
  });

  it("moves both balances when a payment is recorded", () => {
    const before = byUser(computeBalances(["you", "sam"], expenses, []));
    const after = byUser(computeBalances(["you", "sam"], expenses, payments));
    expect(after.sam - before.sam).toBe(1000);
    expect(after.you - before.you).toBe(-1000);
  });

  it("keeps people who left the group but still appear in the history", () => {
    const balances = computeBalances(["you", "alex", "sam"], expenses, []);
    expect(byUser(balances).mia).toBe(-2000);
    expect(total(balances)).toBe(0);
  });
});

describe("US5 settle up", () => {
  it("suggests payments that clear every balance", () => {
    const balances = computeBalances(
      ["you", "alex", "sam", "mia"],
      expenses,
      payments,
    );
    const settlements = suggestSettlements(balances);
    const remaining = byUser(balances);
    for (const settlement of settlements) {
      expect(settlement.amountCents).toBeGreaterThan(0);
      remaining[settlement.fromUserId] += settlement.amountCents;
      remaining[settlement.toUserId] -= settlement.amountCents;
    }
    expect(Object.values(remaining).every((cents) => cents === 0)).toBe(true);
  });

  it("uses at most one fewer payment than the members with a non-zero balance", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let run = 0; run < 200; run += 1) {
      const size = 2 + Math.floor(random() * 6);
      const amounts = Array.from({ length: size - 1 }, () =>
        Math.floor(random() * 20001 - 10000),
      );
      amounts.push(-amounts.reduce((sum, cents) => sum + cents, 0));
      const balances = amounts.map((balanceCents, index) => ({
        userId: `u${index}`,
        balanceCents,
      }));
      const nonZero = balances.filter((b) => b.balanceCents !== 0).length;
      const settlements = suggestSettlements(balances);
      expect(settlements.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0));

      const remaining = byUser(balances);
      for (const settlement of settlements) {
        remaining[settlement.fromUserId] += settlement.amountCents;
        remaining[settlement.toUserId] -= settlement.amountCents;
      }
      expect(Object.values(remaining).every((cents) => cents === 0)).toBe(true);
    }
  });

  it("suggests nothing when everyone is settled up", () => {
    expect(
      suggestSettlements([
        { userId: "a", balanceCents: 0 },
        { userId: "b", balanceCents: 0 },
      ]),
    ).toEqual([]);
  });

  it("gives the same suggestions whatever order the balances are in", () => {
    const balances = [
      { userId: "a", balanceCents: 3000 },
      { userId: "b", balanceCents: -1000 },
      { userId: "c", balanceCents: -2000 },
    ];
    expect(suggestSettlements([...balances].reverse())).toEqual(
      suggestSettlements(balances),
    );
  });
});

describe("US5 balance breakdown", () => {
  it("lists the expenses and payments behind a balance, newest first", () => {
    const items = balanceBreakdown("sam", expenses, payments);
    expect(items).toEqual([
      {
        kind: "payment",
        id: "p1",
        date: "2026-11-05",
        description: "Payment",
        effectCents: 1000,
      },
      {
        kind: "expense",
        id: "e2",
        date: "2026-11-03",
        description: "Internet",
        effectCents: -2000,
      },
      {
        kind: "expense",
        id: "e1",
        date: "2026-11-01",
        description: "Groceries",
        effectCents: -3000,
      },
    ]);
  });

  it("adds up to the member's balance", () => {
    const balances = byUser(
      computeBalances(["you", "alex", "sam", "mia"], expenses, payments),
    );
    for (const userId of ["you", "alex", "sam", "mia"]) {
      const sum = balanceBreakdown(userId, expenses, payments).reduce(
        (total, item) => total + item.effectCents,
        0,
      );
      expect(sum).toBe(balances[userId]);
    }
  });
});

describe("US5 balance wording", () => {
  it("describes a balance in words, not only by sign", () => {
    expect(describeBalance(3000)).toEqual({
      status: "owed",
      amountCents: 3000,
    });
    expect(describeBalance(-1250)).toEqual({
      status: "owes",
      amountCents: 1250,
    });
    expect(describeBalance(0)).toEqual({ status: "settled", amountCents: 0 });
  });
});

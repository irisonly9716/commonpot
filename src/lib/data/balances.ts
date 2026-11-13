import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import {
  balanceBreakdown,
  computeBalances,
  describeBalance,
  suggestSettlements,
  type BalanceExpense,
  type BalancePayment,
  type BreakdownItem,
  type Settlement,
} from "@/lib/domain/balances";

export type GroupLedger = {
  currency: string;
  members: Array<{ id: string; displayName: string }>;
  expenses: BalanceExpense[];
  payments: BalancePayment[];
};

export type NamedBalance = {
  userId: string;
  displayName: string;
  balanceCents: number;
  status: "owed" | "owes" | "settled";
};

export type GroupBalances = {
  currency: string;
  balances: NamedBalance[];
  settlements: Settlement[];
};

/**
 * Loads everything a group's balances depend on, through the caller's Supabase
 * client so RLS decides what they can see. Returns null when the group isn't
 * visible to them.
 */
export async function loadGroupLedger(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<GroupLedger | null> {
  const [group, members, expenses, payments] = await Promise.all([
    supabase.from("groups").select("currency").eq("id", groupId).maybeSingle(),
    supabase.rpc("group_member_profiles", { p_group_id: groupId }),
    supabase
      .from("expenses")
      .select(
        "id, description, expense_date, paid_by, amount_cents, expense_shares(user_id, amount_cents)",
      )
      .eq("group_id", groupId),
    supabase
      .from("payments")
      .select("id, paid_by, paid_to, amount_cents, payment_date")
      .eq("group_id", groupId),
  ]);

  if (group.error || members.error || expenses.error || payments.error) {
    throw new Error("Could not load group balances");
  }
  if (!group.data) return null;

  return {
    currency: group.data.currency,
    members: [...(members.data ?? [])]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((member) => ({
        id: member.id,
        displayName: member.display_name || "Unnamed member",
      })),
    expenses: (expenses.data ?? []).map((expense) => ({
      id: expense.id,
      description: expense.description,
      expenseDate: expense.expense_date,
      paidBy: expense.paid_by,
      amountCents: expense.amount_cents,
      shares: expense.expense_shares.map((share) => ({
        userId: share.user_id,
        amountCents: share.amount_cents,
      })),
    })),
    payments: (payments.data ?? []).map((payment) => ({
      id: payment.id,
      paidBy: payment.paid_by,
      paidTo: payment.paid_to,
      amountCents: payment.amount_cents,
      paymentDate: payment.payment_date,
    })),
  };
}

function nameOf(ledger: GroupLedger, userId: string): string {
  return (
    ledger.members.find((member) => member.id === userId)?.displayName ??
    "Former member"
  );
}

export function buildGroupBalances(ledger: GroupLedger): GroupBalances {
  const balances = computeBalances(
    ledger.members.map((member) => member.id),
    ledger.expenses,
    ledger.payments,
  );

  return {
    currency: ledger.currency,
    balances: balances.map((balance) => ({
      ...balance,
      displayName: nameOf(ledger, balance.userId),
      status: describeBalance(balance.balanceCents).status,
    })),
    settlements: suggestSettlements(balances),
  };
}

/** Breakdown for one person, or null if they aren't in the group or its history. */
export function buildBalanceBreakdown(
  ledger: GroupLedger,
  userId: string,
): (NamedBalance & { items: BreakdownItem[] }) | null {
  const balance = buildGroupBalances(ledger).balances.find(
    (item) => item.userId === userId,
  );
  if (!balance) return null;

  const items = balanceBreakdown(userId, ledger.expenses, ledger.payments).map(
    (item) => {
      if (item.kind !== "payment") return item;
      const payment = ledger.payments.find((p) => p.id === item.id);
      if (!payment) return item;
      const description =
        payment.paidBy === userId
          ? `Paid ${nameOf(ledger, payment.paidTo)}`
          : `Received from ${nameOf(ledger, payment.paidBy)}`;
      return { ...item, description };
    },
  );

  return { ...balance, items };
}

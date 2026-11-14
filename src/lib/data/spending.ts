import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import { shiftMonth, type SpendingExpense } from "@/lib/domain/spending";

export type GroupSpending = {
  currency: string;
  expenses: SpendingExpense[];
};

/**
 * Loads the expenses behind the insights page: the chosen month and the five
 * before it, with each person's share. Goes through the caller's Supabase client
 * so RLS decides what they can see. Returns null unless `userId` is a member:
 * site admins can read group rows (for counts) but are not members, and they
 * must never reach amounts.
 */
export async function loadGroupSpending(
  supabase: SupabaseClient<Database>,
  groupId: string,
  endMonth: string,
  userId: string,
): Promise<GroupSpending | null> {
  const from = `${shiftMonth(endMonth, -5)}-01`;
  const before = `${shiftMonth(endMonth, 1)}-01`;

  const [group, membership, expenses] = await Promise.all([
    supabase.from("groups").select("currency").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select(
        "id, expense_date, amount_cents, categories(name), expense_shares(user_id, amount_cents)",
      )
      .eq("group_id", groupId)
      .gte("expense_date", from)
      .lt("expense_date", before),
  ]);

  if (group.error || membership.error || expenses.error) {
    throw new Error("Could not load group spending");
  }
  if (!group.data || !membership.data) return null;

  return {
    currency: group.data.currency,
    expenses: (expenses.data ?? []).map((expense) => ({
      id: expense.id,
      expenseDate: expense.expense_date,
      amountCents: expense.amount_cents,
      categoryName: expense.categories?.name ?? null,
      shares: expense.expense_shares.map((share) => ({
        userId: share.user_id,
        amountCents: share.amount_cents,
      })),
    })),
  };
}

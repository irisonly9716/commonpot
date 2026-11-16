import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import {
  buildMySpending,
  monthRange,
  TREND_MONTHS,
  type GroupShareItem,
  type MySpending,
} from "@/lib/domain/personal-spending";
import type { PersonalExpenseInput } from "@/lib/validation/personal";

type Client = SupabaseClient<Database>;

export type PersonalExpense = {
  id: string;
  amountCents: number;
  description: string;
  category: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS =
  "id, amount_cents, description, category, expense_date, created_at, updated_at";

type Row = {
  id: string;
  amount_cents: number;
  description: string;
  category: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
};

function toPersonalExpense(row: Row): PersonalExpense {
  return {
    id: row.id,
    amountCents: row.amount_cents,
    description: row.description,
    category: row.category,
    expenseDate: row.expense_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: PersonalExpenseInput) {
  return {
    amount_cents: input.amountCents,
    description: input.description,
    category: input.category,
    expense_date: input.expenseDate,
  };
}

/**
 * My personal expenses, newest first, for one month or all of them. Row level
 * security already limits the table to the owner; the user_id filter only
 * keeps the query explicit.
 */
export async function listPersonalExpenses(
  supabase: Client,
  userId: string,
  month?: string,
): Promise<PersonalExpense[]> {
  let query = supabase
    .from("personal_expenses")
    .select(COLUMNS)
    .eq("user_id", userId);
  if (month) {
    const { from, to } = monthRange(month, 1);
    query = query.gte("expense_date", from).lt("expense_date", to);
  }
  const { data, error } = await query
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load personal expenses");
  return data.map(toPersonalExpense);
}

export async function createPersonalExpense(
  supabase: Client,
  userId: string,
  input: PersonalExpenseInput,
): Promise<PersonalExpense> {
  const { data, error } = await supabase
    .from("personal_expenses")
    .insert({ user_id: userId, ...toRow(input) })
    .select(COLUMNS)
    .single();
  if (error) throw new Error("Could not save the personal expense");
  return toPersonalExpense(data);
}

/** Null when the expense doesn't exist or isn't mine (RLS hides it). */
export async function updatePersonalExpense(
  supabase: Client,
  userId: string,
  expenseId: string,
  input: PersonalExpenseInput,
): Promise<PersonalExpense | null> {
  const { data, error } = await supabase
    .from("personal_expenses")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", expenseId)
    .eq("user_id", userId)
    .select(COLUMNS);
  if (error) throw new Error("Could not save the personal expense");
  return data[0] ? toPersonalExpense(data[0]) : null;
}

/** False when the expense doesn't exist or isn't mine (RLS hides it). */
export async function deletePersonalExpense(
  supabase: Client,
  userId: string,
  expenseId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("personal_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw new Error("Could not delete the personal expense");
  return data.length > 0;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * My spending for `month` and the 5 months before it: my personal expenses
 * plus my share of every expense in my groups. Shares are read from
 * expense_shares, so nothing is entered twice, and RLS only returns groups
 * I belong to.
 */
export async function loadMySpending(
  supabase: Client,
  userId: string,
  month: string,
): Promise<MySpending> {
  const { from, to } = monthRange(month, TREND_MONTHS);

  const [personalResult, sharesResult] = await Promise.all([
    supabase
      .from("personal_expenses")
      .select("amount_cents, category, expense_date")
      .eq("user_id", userId)
      .gte("expense_date", from)
      .lt("expense_date", to),
    supabase
      .from("expense_shares")
      .select(
        "amount_cents, expenses!inner(expense_date, group_id, categories(name), groups!inner(name, currency))",
      )
      .eq("user_id", userId)
      .gte("expenses.expense_date", from)
      .lt("expenses.expense_date", to),
  ]);
  if (personalResult.error || sharesResult.error) {
    throw new Error("Could not load your spending");
  }

  const shares: GroupShareItem[] = [];
  for (const row of sharesResult.data) {
    const expense = one(row.expenses);
    const group = expense ? one(expense.groups) : null;
    if (!expense || !group) continue;
    shares.push({
      amountCents: row.amount_cents,
      expenseDate: expense.expense_date,
      groupId: expense.group_id,
      groupName: group.name,
      currency: group.currency,
      category: one(expense.categories)?.name ?? null,
    });
  }

  return buildMySpending({
    month,
    personal: personalResult.data.map((row) => ({
      amountCents: row.amount_cents,
      category: row.category,
      expenseDate: row.expense_date,
    })),
    shares,
  });
}

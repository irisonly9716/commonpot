import { loadGroupActivity, type ActivityItem } from "@/lib/data/activity";
import { loadMyAlerts, type AlertItem } from "@/lib/data/alerts";
import { createServerSupabaseClient } from "@/lib/db/server";
import type { ExpenseShare, GroupRole } from "@/lib/domain/expenses";

export type ExpenseMember = {
  id: string;
  displayName: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
};

export type ExpenseListItem = {
  id: string;
  amountCents: number;
  description: string;
  expenseDate: string;
  createdAt: string;
  paidBy: string;
  createdBy: string;
  categoryId: string | null;
};

export type EditableExpense = {
  id: string;
  amountCents: number;
  description: string;
  categoryId: string | null;
  expenseDate: string;
  paidBy: string;
  createdBy: string;
  shares: ExpenseShare[];
};

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function loadGroupBasics(supabase: ServerSupabase, groupId: string) {
  const [groupResult, membersResult, categoriesResult] = await Promise.all([
    supabase.from("groups").select("currency").eq("id", groupId).maybeSingle(),
    supabase.rpc("group_member_profiles", { p_group_id: groupId }),
    supabase
      .from("categories")
      .select("id, name")
      .eq("group_id", groupId)
      .eq("is_archived", false)
      .order("name"),
  ]);
  if (groupResult.error || membersResult.error || categoriesResult.error) {
    throw new Error("Could not load the group");
  }

  return {
    group: groupResult.data,
    currency: groupResult.data?.currency ?? "USD",
    members: (membersResult.data ?? []).map((member) => ({
      id: member.id,
      displayName: member.display_name || "Unnamed member",
    })),
    categories: categoriesResult.data ?? [],
  };
}

export async function getExpensePageData(groupId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      group: null,
      role: null,
      currency: "USD",
      members: [],
      categories: [],
      expenses: [],
      activity: [] as ActivityItem[],
      alerts: [] as AlertItem[],
    };
  }

  const [basics, roleResult, expensesResult, activity, alerts] =
    await Promise.all([
      loadGroupBasics(supabase, groupId),
      supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("expenses")
        .select(
          "id, amount_cents, description, expense_date, created_at, paid_by, created_by, category_id",
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
      loadGroupActivity(supabase, groupId, 20),
      loadMyAlerts(supabase, { unreadOnly: true, groupId }),
    ]);

  if (roleResult.error || expensesResult.error) {
    throw new Error("Could not load expense page data");
  }

  return {
    user,
    ...basics,
    role: (roleResult.data?.role ?? null) as GroupRole | null,
    expenses: (expensesResult.data ?? []).map((expense) => ({
      id: expense.id,
      amountCents: expense.amount_cents,
      description: expense.description,
      expenseDate: expense.expense_date,
      createdAt: expense.created_at,
      paidBy: expense.paid_by,
      createdBy: expense.created_by,
      categoryId: expense.category_id,
    })),
    activity,
    alerts,
  };
}

/** One expense with its shares, for the edit page. RLS hides other groups. */
export async function getExpenseEditData(groupId: string, expenseId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      currency: "USD",
      members: [],
      categories: [],
      expense: null,
    };
  }

  const [basics, expenseResult] = await Promise.all([
    loadGroupBasics(supabase, groupId),
    supabase
      .from("expenses")
      .select(
        "id, amount_cents, description, category_id, expense_date, paid_by, created_by, expense_shares(user_id, amount_cents)",
      )
      .eq("id", expenseId)
      .eq("group_id", groupId)
      .maybeSingle(),
  ]);
  if (expenseResult.error) throw new Error("Could not load the expense");

  const row = expenseResult.data;
  const expense: EditableExpense | null = row
    ? {
        id: row.id,
        amountCents: row.amount_cents,
        description: row.description,
        categoryId: row.category_id,
        expenseDate: row.expense_date,
        paidBy: row.paid_by,
        createdBy: row.created_by,
        shares: row.expense_shares
          .map((share) => ({
            userId: share.user_id,
            amountCents: share.amount_cents,
          }))
          .sort((a, b) => a.userId.localeCompare(b.userId)),
      }
    : null;

  return {
    user,
    currency: basics.currency,
    members: basics.members,
    categories: basics.categories,
    expense: basics.group ? expense : null,
  };
}

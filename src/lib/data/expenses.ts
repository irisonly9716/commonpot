import { createServerSupabaseClient } from "@/lib/db/server";

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
  categoryId: string | null;
};

export async function getExpensePageData(groupId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      group: null,
      currency: "USD",
      members: [],
      categories: [],
      expenses: [],
    };
  }

  const [groupResult, membersResult, categoriesResult, expensesResult] =
    await Promise.all([
      supabase
        .from("groups")
        .select("currency")
        .eq("id", groupId)
        .maybeSingle(),
      supabase.rpc("group_member_profiles", { p_group_id: groupId }),
      supabase
        .from("categories")
        .select("id, name")
        .eq("group_id", groupId)
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("expenses")
        .select(
          "id, amount_cents, description, expense_date, created_at, paid_by, category_id",
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: false }),
    ]);

  if (
    groupResult.error ||
    membersResult.error ||
    categoriesResult.error ||
    expensesResult.error
  ) {
    throw new Error("Could not load expense page data");
  }

  return {
    user,
    group: groupResult.data,
    currency: groupResult.data?.currency ?? "USD",
    members: (membersResult.data ?? []).map((member) => ({
      id: member.id,
      displayName: member.display_name || "Unnamed member",
    })),
    categories: categoriesResult.data ?? [],
    expenses: (expensesResult.data ?? []).map((expense) => ({
      id: expense.id,
      amountCents: expense.amount_cents,
      description: expense.description,
      expenseDate: expense.expense_date,
      createdAt: expense.created_at,
      paidBy: expense.paid_by,
      categoryId: expense.category_id,
    })),
  };
}

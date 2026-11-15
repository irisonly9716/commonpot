import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  suspendedAt: string | null;
  isSiteAdmin: boolean;
  groupCount: number;
  expenseCount: number;
};

export type AdminGroup = {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  expenseCount: number;
};

export type DefaultCategory = {
  id: string;
  name: string;
  isArchived: boolean;
};

/**
 * Everything the site admin dashboard shows: accounts and groups with counts,
 * and the default category list. The database functions raise for anyone who is
 * not a site admin, and return no amounts or expense details.
 */
export async function loadAdminDashboard(
  supabase: SupabaseClient<Database>,
): Promise<{
  users: AdminUser[];
  groups: AdminGroup[];
  categories: DefaultCategory[];
}> {
  const [users, groups, categories] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_list_groups"),
    supabase
      .from("default_categories")
      .select("id, name, is_archived")
      .order("name"),
  ]);
  if (users.error || groups.error || categories.error) {
    throw new Error("Could not load the admin dashboard");
  }

  return {
    users: users.data.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      suspendedAt: user.suspended_at,
      isSiteAdmin: user.is_site_admin,
      groupCount: Number(user.group_count),
      expenseCount: Number(user.expense_count),
    })),
    groups: groups.data.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.created_at,
      memberCount: Number(group.member_count),
      expenseCount: Number(group.expense_count),
    })),
    categories: categories.data.map((row) => ({
      id: row.id,
      name: row.name,
      isArchived: row.is_archived,
    })),
  };
}

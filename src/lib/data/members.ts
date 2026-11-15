import type { SupabaseClient } from "@supabase/supabase-js";

import { buildGroupBalances, loadGroupLedger } from "@/lib/data/balances";
import type { Database } from "@/lib/db/database.types";

/**
 * What the group owes one member, in integer cents: positive when they are owed
 * money, negative when they owe it, 0 when settled. Uses the same calculation as
 * the balances page. Returns null if the group is not visible to the caller.
 */
export async function memberBalanceCents(
  supabase: SupabaseClient<Database>,
  groupId: string,
  userId: string,
): Promise<number | null> {
  const ledger = await loadGroupLedger(supabase, groupId);
  if (!ledger) return null;
  const balance = buildGroupBalances(ledger).balances.find(
    (item) => item.userId === userId,
  );
  return balance?.balanceCents ?? 0;
}

export type GroupCategory = { id: string; name: string; isArchived: boolean };

/** The group's categories by name, archived ones included. RLS applies. */
export async function listGroupCategories(
  supabase: SupabaseClient<Database>,
  groupId: string,
): Promise<GroupCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, is_archived")
    .eq("group_id", groupId)
    .order("name");
  if (error) throw new Error("Could not load categories");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    isArchived: row.is_archived,
  }));
}

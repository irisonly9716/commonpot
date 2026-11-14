import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";

export type ActivityItem = {
  id: string;
  action: string;
  description: string;
  amountCents: number | null;
  actorId: string | null;
  actorName: string;
  createdAt: string;
};

/**
 * The group's activity feed, newest first. Triggers write a row for every
 * added, edited or deleted expense and every payment. RLS limits it to members.
 */
export async function loadGroupActivity(
  supabase: SupabaseClient<Database>,
  groupId: string,
  limit = 50,
): Promise<ActivityItem[]> {
  const [activityResult, membersResult] = await Promise.all([
    supabase
      .from("activity")
      .select("id, action, description, amount_cents, actor_id, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.rpc("group_member_profiles", { p_group_id: groupId }),
  ]);
  if (activityResult.error || membersResult.error) {
    throw new Error("Could not load the activity feed");
  }

  const names = new Map(
    (membersResult.data ?? []).map((member) => [
      member.id,
      member.display_name || "Unnamed member",
    ]),
  );

  return activityResult.data.map((row) => ({
    id: row.id,
    action: row.action,
    description: row.description,
    amountCents: row.amount_cents,
    actorId: row.actor_id,
    actorName: row.actor_id
      ? (names.get(row.actor_id) ?? "Former member")
      : "Someone",
    createdAt: row.created_at,
  }));
}

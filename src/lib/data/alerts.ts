import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";

export type AlertItem = {
  id: string;
  groupId: string | null;
  kind: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type AlertFilter = {
  unreadOnly?: boolean;
  groupId?: string;
};

/** The signed-in user's own alerts, newest first. RLS hides everyone else's. */
export async function loadMyAlerts(
  supabase: SupabaseClient<Database>,
  { unreadOnly = false, groupId }: AlertFilter = {},
  limit = 50,
): Promise<AlertItem[]> {
  let query = supabase
    .from("alerts")
    .select("id, group_id, kind, message, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.is("read_at", null);
  if (groupId) query = query.eq("group_id", groupId);

  const { data, error } = await query;
  if (error) throw new Error("Could not load alerts");

  return data.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    kind: row.kind,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
  }));
}

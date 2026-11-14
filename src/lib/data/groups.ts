import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";

type Client = SupabaseClient<Database>;

export type GroupRole = "admin" | "member";

export type GroupSummary = {
  id: string;
  name: string;
  currency: string;
  role: GroupRole;
};

export type GroupMember = {
  userId: string;
  displayName: string;
  role: GroupRole;
};

export type GroupDetail = {
  id: string;
  name: string;
  currency: string;
  role: GroupRole;
  members: GroupMember[];
};

export type InviteSummary = {
  id: string;
  token: string;
  expiresAt: string;
};

/** The signed-in user's groups. Row level security limits this to their own. */
export async function listMyGroups(
  supabase: Client,
  userId: string,
): Promise<GroupSummary[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("role, joined_at, groups!inner(id, name, currency)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });
  if (error) throw new Error("Could not load your groups");

  return data.map((row) => {
    const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
    return {
      id: group.id,
      name: group.name,
      currency: group.currency,
      role: row.role,
    };
  });
}

/** One group with its members and roles, or null when the user is not in it. */
export async function getGroupDetail(
  supabase: Client,
  groupId: string,
  userId: string,
): Promise<GroupDetail | null> {
  const [groupResult, membersResult, namesResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, currency")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, role")
      .eq("group_id", groupId),
    supabase.rpc("group_member_profiles", { p_group_id: groupId }),
  ]);
  if (groupResult.error || membersResult.error || namesResult.error) {
    throw new Error("Could not load the group");
  }
  const group = groupResult.data;
  const me = membersResult.data.find((m) => m.user_id === userId);
  if (!group || !me) return null;

  const names = new Map(
    namesResult.data.map((p) => [p.id, p.display_name || "Unnamed member"]),
  );
  const members = membersResult.data
    .map((m) => ({
      userId: m.user_id,
      displayName: names.get(m.user_id) ?? "Unnamed member",
      role: m.role,
    }))
    // Admins first, then by name, so the order is the same for everyone.
    .sort(
      (a, b) =>
        Number(b.role === "admin") - Number(a.role === "admin") ||
        a.displayName.localeCompare(b.displayName) ||
        a.userId.localeCompare(b.userId),
    );

  return { ...group, role: me.role, members };
}

/** Invites that are still usable (not revoked, not expired). Admins only, by row level security. */
export async function listActiveInvites(
  supabase: Client,
  groupId: string,
): Promise<InviteSummary[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("id, token, expires_at")
    .eq("group_id", groupId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load invite links");
  return data.map((i) => ({
    id: i.id,
    token: i.token,
    expiresAt: i.expires_at,
  }));
}

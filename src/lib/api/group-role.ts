import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import type { GroupRole } from "@/lib/data/groups";
import type { Database } from "@/lib/db/database.types";

export type GroupRouteContext = {
  params: Promise<{ groupId: string }>;
};

export type GroupRoleAccess =
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      user: User;
      groupId: string;
      role: GroupRole;
    }
  | { ok: false; response: Response };

/**
 * Start of every group route that needs to know the caller's role: authenticate
 * (401), validate the group id (422), then find the membership (404, so someone
 * outside the group cannot tell it exists).
 */
export async function requireGroupRole(
  request: Request,
  context: GroupRouteContext,
): Promise<GroupRoleAccess> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return {
      ok: false,
      response: apiError("UNAUTHORIZED", "Authentication required", 401),
    };
  }

  const { groupId } = await context.params;
  if (!z.uuid().safeParse(groupId).success) {
    return {
      ok: false,
      response: apiError("VALIDATION_ERROR", "Invalid group id", 422),
    };
  }

  const { data, error } = await authenticated.supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", authenticated.user.id)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      response: apiError("DATABASE_ERROR", "Could not check membership", 500),
    };
  }
  if (!data) {
    return {
      ok: false,
      response: apiError("NOT_FOUND", "Group not found", 404),
    };
  }

  return { ok: true, ...authenticated, groupId, role: data.role };
}

export function requireAdmin(access: Extract<GroupRoleAccess, { ok: true }>) {
  return access.role === "admin"
    ? null
    : apiError("FORBIDDEN", "Only group admins can do this", 403);
}

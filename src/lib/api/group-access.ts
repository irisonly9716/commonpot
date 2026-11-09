import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import type { Database } from "@/lib/db/database.types";

export type GroupRouteContext = {
  params: Promise<{ groupId: string }>;
};

export type GroupAccess =
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      user: User;
      groupId: string;
    }
  | { ok: false; response: Response };

/**
 * Shared start of every group route: authenticate (401), validate the group id
 * (422), then check membership (404, so non-members can't tell a group exists).
 */
export async function requireGroupMember(
  request: Request,
  context: GroupRouteContext,
): Promise<GroupAccess> {
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
    .select("user_id")
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

  return { ok: true, ...authenticated, groupId };
}

export function hasJsonBody(request: Request): boolean {
  return (
    request.headers.get("content-type")?.split(";")[0].trim() ===
    "application/json"
  );
}

import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { requireAdmin, requireGroupMember } from "@/lib/api/group-access";

type InviteRouteContext = {
  params: Promise<{ groupId: string; inviteId: string }>;
};

/** Revokes an invite link so it can no longer be used. Admins only. */
export async function DELETE(
  request: Request,
  context: InviteRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  const { inviteId } = await context.params;
  if (!z.uuid().safeParse(inviteId).success) {
    return apiError("VALIDATION_ERROR", "Invalid invite id", 422);
  }

  const { data, error } = await access.supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("group_id", access.groupId)
    .is("revoked_at", null)
    .select("id");
  if (error) {
    return apiError("DATABASE_ERROR", "Could not revoke the invite link", 500);
  }
  if (data.length === 0) {
    return apiError("NOT_FOUND", "Invite link not found", 404);
  }
  return new Response(null, { status: 204 });
}

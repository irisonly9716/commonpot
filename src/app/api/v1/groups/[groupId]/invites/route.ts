import { apiError } from "@/lib/api/errors";
import {
  requireAdmin,
  requireGroupMember,
  type GroupRouteContext,
} from "@/lib/api/group-access";
import { listActiveInvites } from "@/lib/data/groups";
import { buildInviteUrl } from "@/lib/groups/invite-url";

/** Invite links that can still be used. Admins only. */
export async function GET(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  try {
    const origin = new URL(request.url).origin;
    const invites = await listActiveInvites(access.supabase, access.groupId);
    return Response.json(
      invites.map((invite) => ({
        ...invite,
        url: buildInviteUrl(origin, invite.token),
      })),
    );
  } catch {
    return apiError("DATABASE_ERROR", "Could not load invite links", 500);
  }
}

/** Creates an invite link that expires in 7 days (the database default). Admins only. */
export async function POST(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  const { data, error } = await access.supabase
    .from("invites")
    .insert({ group_id: access.groupId, created_by: access.user.id })
    .select("id, token, expires_at")
    .single();
  if (error) {
    return apiError("DATABASE_ERROR", "Could not create the invite link", 500);
  }

  return Response.json(
    {
      id: data.id,
      token: data.token,
      url: buildInviteUrl(new URL(request.url).origin, data.token),
      expiresAt: data.expires_at,
    },
    { status: 201 },
  );
}

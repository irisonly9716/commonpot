import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { requireAdmin, requireGroupMember } from "@/lib/api/group-access";
import { readJsonBody } from "@/lib/api/json-body";
import { memberBalanceCents } from "@/lib/data/members";
import { updateMemberRoleSchema } from "@/lib/validation/members";

type MemberRouteContext = {
  params: Promise<{ groupId: string; userId: string }>;
};

// "group must retain at least one admin" comes from the group_requires_admin
// trigger in the database.
function isLastAdminError(error: { message: string }): boolean {
  return error.message.includes("at least one admin");
}

/** Promotes a member to admin, or sets an admin back to member. Admins only. */
export async function PATCH(
  request: Request,
  context: MemberRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  const { userId } = await context.params;
  if (!z.uuid().safeParse(userId).success) {
    return apiError("VALIDATION_ERROR", "Invalid user id", 422);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = updateMemberRoleSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      'role must be "admin" or "member"',
      422,
    );
  }

  if (userId === access.user.id) {
    return apiError(
      "CONFLICT",
      "You cannot change your own role. Promote someone else, then leave the group.",
      409,
    );
  }

  const { data, error } = await access.supabase
    .from("group_members")
    .update({ role: parsed.data.role })
    .eq("group_id", access.groupId)
    .eq("user_id", userId)
    .select("user_id, role");
  if (error) {
    if (isLastAdminError(error)) {
      return apiError("LAST_ADMIN", "A group needs at least one admin", 409);
    }
    return apiError("DATABASE_ERROR", "Could not change the role", 500);
  }
  if (data.length === 0) return apiError("NOT_FOUND", "Member not found", 404);

  return Response.json({ userId: data[0].user_id, role: data[0].role });
}

/**
 * Removes a member, or lets the caller leave when `userId` is their own id.
 *
 * A member whose balance is not zero is not removed until an admin repeats the
 * request with `?confirm=true`. Leaving never takes `confirm`: you settle up
 * first. The last admin cannot leave (409 LAST_ADMIN).
 */
export async function DELETE(
  request: Request,
  context: MemberRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  const { userId } = await context.params;
  if (!z.uuid().safeParse(userId).success) {
    return apiError("VALIDATION_ERROR", "Invalid user id", 422);
  }

  const isLeaving = userId === access.user.id;
  if (!isLeaving) {
    const forbidden = requireAdmin(access);
    if (forbidden) return forbidden;
  }

  // The person must be in the group (404 otherwise).
  const { data: membership, error: membershipError } = await access.supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", access.groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) {
    return apiError("DATABASE_ERROR", "Could not load the member", 500);
  }
  if (!membership) return apiError("NOT_FOUND", "Member not found", 404);

  const confirmed =
    !isLeaving && new URL(request.url).searchParams.get("confirm") === "true";
  if (!confirmed) {
    let balanceCents: number | null;
    try {
      balanceCents = await memberBalanceCents(
        access.supabase,
        access.groupId,
        userId,
      );
    } catch {
      return apiError("DATABASE_ERROR", "Could not check the balance", 500);
    }
    if (balanceCents !== null && balanceCents !== 0) {
      return apiError(
        "BALANCE_NOT_ZERO",
        isLeaving
          ? "Settle up before leaving the group"
          : "This member has a balance. Confirm to remove them anyway",
        409,
        { balanceCents },
      );
    }
  }

  if (isLeaving) {
    const { error } = await access.supabase.rpc("leave_group", {
      p_group_id: access.groupId,
    });
    if (error) {
      if (isLastAdminError(error)) {
        return apiError(
          "LAST_ADMIN",
          "A group needs at least one admin. Promote someone before you leave",
          409,
        );
      }
      return apiError("DATABASE_ERROR", "Could not leave the group", 500);
    }
    return new Response(null, { status: 204 });
  }

  const { error } = await access.supabase
    .from("group_members")
    .delete()
    .eq("group_id", access.groupId)
    .eq("user_id", userId);
  if (error) {
    if (isLastAdminError(error)) {
      return apiError("LAST_ADMIN", "A group needs at least one admin", 409);
    }
    return apiError("DATABASE_ERROR", "Could not remove the member", 500);
  }
  return new Response(null, { status: 204 });
}

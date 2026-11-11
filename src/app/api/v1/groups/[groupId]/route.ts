import { requireGroupRole, type GroupRouteContext } from "@/lib/api/group-role";
import { apiError } from "@/lib/api/errors";
import { getGroupDetail } from "@/lib/data/groups";

/** One group with its members and their roles. Every member can read it. */
export async function GET(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupRole(request, context);
  if (!access.ok) return access.response;

  try {
    const group = await getGroupDetail(
      access.supabase,
      access.groupId,
      access.user.id,
    );
    if (!group) return apiError("NOT_FOUND", "Group not found", 404);
    return Response.json(group);
  } catch {
    return apiError("DATABASE_ERROR", "Could not load the group", 500);
  }
}

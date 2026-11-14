import { apiError } from "@/lib/api/errors";
import {
  requireGroupMember,
  type GroupRouteContext,
} from "@/lib/api/group-access";
import { loadGroupActivity } from "@/lib/data/activity";

export async function GET(request: Request, context: GroupRouteContext) {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  try {
    return Response.json(
      await loadGroupActivity(access.supabase, access.groupId),
    );
  } catch {
    return apiError("DATABASE_ERROR", "Could not load the activity feed", 500);
  }
}

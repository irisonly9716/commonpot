import { apiError } from "@/lib/api/errors";
import {
  requireGroupMember,
  type GroupRouteContext,
} from "@/lib/api/group-access";
import { buildGroupBalances, loadGroupLedger } from "@/lib/data/balances";

export async function GET(request: Request, context: GroupRouteContext) {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  try {
    const ledger = await loadGroupLedger(access.supabase, access.groupId);
    if (!ledger) return apiError("NOT_FOUND", "Group not found", 404);
    return Response.json(buildGroupBalances(ledger));
  } catch {
    return apiError("DATABASE_ERROR", "Could not load balances", 500);
  }
}

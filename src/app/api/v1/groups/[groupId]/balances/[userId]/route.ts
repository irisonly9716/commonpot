import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { requireGroupMember } from "@/lib/api/group-access";
import { buildBalanceBreakdown, loadGroupLedger } from "@/lib/data/balances";

type BreakdownRouteContext = {
  params: Promise<{ groupId: string; userId: string }>;
};

export async function GET(request: Request, context: BreakdownRouteContext) {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  const { userId } = await context.params;
  if (!z.uuid().safeParse(userId).success) {
    return apiError("VALIDATION_ERROR", "Invalid user id", 422);
  }

  try {
    const ledger = await loadGroupLedger(access.supabase, access.groupId);
    const breakdown = ledger && buildBalanceBreakdown(ledger, userId);
    if (!breakdown) {
      return apiError("NOT_FOUND", "Member not found in this group", 404);
    }
    return Response.json(breakdown);
  } catch {
    return apiError("DATABASE_ERROR", "Could not load the balance", 500);
  }
}

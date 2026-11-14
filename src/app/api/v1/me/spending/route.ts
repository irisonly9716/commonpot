import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { loadMySpending } from "@/lib/data/personal";
import { monthSchema } from "@/lib/validation/personal";

/**
 * My spending for `?month=YYYY-MM` (US10): personal expenses plus my share of
 * every group expense, by category, by source and over the last 6 months, with
 * one block per currency.
 */
export async function GET(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const month = monthSchema.safeParse(
    new URL(request.url).searchParams.get("month"),
  );
  if (!month.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Send ?month= as a month in the YYYY-MM format",
      422,
    );
  }

  try {
    return Response.json(
      await loadMySpending(
        authenticated.supabase,
        authenticated.user.id,
        month.data,
      ),
    );
  } catch {
    return apiError("DATABASE_ERROR", "Could not load your spending", 500);
  }
}

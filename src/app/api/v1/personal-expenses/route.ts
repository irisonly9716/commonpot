import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import {
  createPersonalExpense,
  listPersonalExpenses,
} from "@/lib/data/personal";
import { monthSchema, personalExpenseSchema } from "@/lib/validation/personal";

/** My personal expenses (US10), newest first. `?month=YYYY-MM` limits them to one month. */
export async function GET(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const month = new URL(request.url).searchParams.get("month");
  if (month !== null && !monthSchema.safeParse(month).success) {
    return apiError(
      "VALIDATION_ERROR",
      "Use a month in the YYYY-MM format",
      422,
    );
  }

  try {
    return Response.json(
      await listPersonalExpenses(
        authenticated.supabase,
        authenticated.user.id,
        month ?? undefined,
      ),
    );
  } catch {
    return apiError("DATABASE_ERROR", "Could not load personal expenses", 500);
  }
}

/** Logs a personal expense. Only its owner can ever see it. */
export async function POST(request: Request): Promise<Response> {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = personalExpenseSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  try {
    const created = await createPersonalExpense(
      authenticated.supabase,
      authenticated.user.id,
      parsed.data,
    );
    return Response.json(created, { status: 201 });
  } catch {
    return apiError(
      "DATABASE_ERROR",
      "Could not save the personal expense",
      500,
    );
  }
}

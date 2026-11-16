import { z } from "zod";

import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { readJsonBody } from "@/lib/api/json-body";
import {
  deletePersonalExpense,
  updatePersonalExpense,
} from "@/lib/data/personal";
import { personalExpenseSchema } from "@/lib/validation/personal";

type RouteContext = {
  params: Promise<{ expenseId: string }>;
};

const NOT_FOUND = "Personal expense not found";

/**
 * Authenticate (401), then validate the id (422). Someone else's expense is a
 * 404, the same as one that doesn't exist, because RLS hides it.
 */
async function start(request: Request, context: RouteContext) {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated) {
    return {
      ok: false as const,
      response: apiError("UNAUTHORIZED", "Authentication required", 401),
    };
  }
  const { expenseId } = await context.params;
  if (!z.uuid().safeParse(expenseId).success) {
    return {
      ok: false as const,
      response: apiError("VALIDATION_ERROR", "Invalid expense id", 422),
    };
  }
  return { ok: true as const, ...authenticated, expenseId };
}

/** Replaces a personal expense of mine. */
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await start(request, context);
  if (!access.ok) return access.response;

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
    const updated = await updatePersonalExpense(
      access.supabase,
      access.user.id,
      access.expenseId,
      parsed.data,
    );
    if (!updated) return apiError("NOT_FOUND", NOT_FOUND, 404);
    return Response.json(updated);
  } catch {
    return apiError(
      "DATABASE_ERROR",
      "Could not save the personal expense",
      500,
    );
  }
}

/** Deletes a personal expense of mine. */
export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const access = await start(request, context);
  if (!access.ok) return access.response;

  try {
    const deleted = await deletePersonalExpense(
      access.supabase,
      access.user.id,
      access.expenseId,
    );
    if (!deleted) return apiError("NOT_FOUND", NOT_FOUND, 404);
    return new Response(null, { status: 204 });
  } catch {
    return apiError(
      "DATABASE_ERROR",
      "Could not delete the personal expense",
      500,
    );
  }
}

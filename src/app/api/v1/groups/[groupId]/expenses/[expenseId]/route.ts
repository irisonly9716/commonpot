import { z } from "zod";

import { apiError } from "@/lib/api/errors";
import { requireGroupMember, type GroupAccess } from "@/lib/api/group-access";
import { readJsonBody } from "@/lib/api/json-body";
import { canDeleteExpense, canEditExpense } from "@/lib/domain/expenses";
import { expenseCreateSchema } from "@/lib/validation/expenses";

type ExpenseRouteContext = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

type LoadedExpense =
  | {
      ok: true;
      access: Extract<GroupAccess, { ok: true }>;
      expenseId: string;
      createdBy: string;
    }
  | { ok: false; response: Response };

/** 401 → 422 (group id) → 404 (group) → 422 (expense id) → 404 (expense). */
async function loadExpense(
  request: Request,
  context: ExpenseRouteContext,
): Promise<LoadedExpense> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access;

  const { expenseId } = await context.params;
  if (!z.uuid().safeParse(expenseId).success) {
    return {
      ok: false,
      response: apiError("VALIDATION_ERROR", "Invalid expense id", 422),
    };
  }

  const { data, error } = await access.supabase
    .from("expenses")
    .select("created_by")
    .eq("id", expenseId)
    .eq("group_id", access.groupId)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      response: apiError("DATABASE_ERROR", "Could not load the expense", 500),
    };
  }
  if (!data) {
    return {
      ok: false,
      response: apiError("NOT_FOUND", "Expense not found", 404),
    };
  }

  return { ok: true, access, expenseId, createdBy: data.created_by };
}

export async function PATCH(request: Request, context: ExpenseRouteContext) {
  const loaded = await loadExpense(request, context);
  if (!loaded.ok) return loaded.response;
  const { access, expenseId, createdBy } = loaded;

  if (
    !canEditExpense(
      { userId: access.user.id, role: access.role },
      { createdBy },
    )
  ) {
    return apiError(
      "FORBIDDEN",
      "Only the person who logged this expense can edit it",
      403,
    );
  }

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;

  const parsed = expenseCreateSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  const expense = parsed.data;
  const { error } = await access.supabase.rpc("update_expense", {
    p_expense_id: expenseId,
    p_expense: {
      paid_by: expense.paidBy,
      category_id: expense.categoryId,
      amount_cents: expense.amountCents,
      description: expense.description,
      expense_date: expense.expenseDate,
    },
    p_shares: expense.shares.map((share) => ({
      user_id: share.userId,
      amount_cents: share.amountCents,
    })),
  });

  if (error) {
    // 42501: row-level security refused it. P0001 or 23xxx: a trigger or a
    // constraint rejected it, for example a payer outside the group.
    if (error.code === "42501") {
      return apiError(
        "FORBIDDEN",
        "Only the person who logged this expense can edit it",
        403,
      );
    }
    if (error.code === "P0001" || error.code?.startsWith("23")) {
      return apiError("INVALID_EXPENSE", "Could not update the expense", 422);
    }
    return apiError("DATABASE_ERROR", "Could not update the expense", 500);
  }

  return Response.json({ id: expenseId });
}

export async function DELETE(request: Request, context: ExpenseRouteContext) {
  const loaded = await loadExpense(request, context);
  if (!loaded.ok) return loaded.response;
  const { access, expenseId, createdBy } = loaded;

  if (
    !canDeleteExpense(
      { userId: access.user.id, role: access.role },
      { createdBy },
    )
  ) {
    return apiError(
      "FORBIDDEN",
      "Only the person who logged this expense or a group admin can delete it",
      403,
    );
  }

  // A trigger records the deletion in the activity feed and, when someone
  // else deleted it, alerts the person who logged it.
  const { data, error } = await access.supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", access.groupId)
    .select("id");

  if (error) {
    return apiError("DATABASE_ERROR", "Could not delete the expense", 500);
  }
  if (data.length === 0) {
    return apiError(
      "FORBIDDEN",
      "Only the person who logged this expense or a group admin can delete it",
      403,
    );
  }

  return new Response(null, { status: 204 });
}

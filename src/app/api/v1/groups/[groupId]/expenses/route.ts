import { getAuthenticatedSupabase } from "../../../../../../lib/api/auth";
import { apiError } from "../../../../../../lib/api/errors";
import { expenseCreateSchema } from "../../../../../../lib/validation/expenses";

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

async function getMembership(
  supabase: Awaited<ReturnType<typeof getAuthenticatedSupabase>>,
  groupId: string,
  userId: string,
) {
  if (!supabase) return null;
  const { data } = await supabase.supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function GET(request: Request, context: RouteContext) {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated)
    return apiError("UNAUTHORIZED", "Authentication required", 401);

  const { groupId } = await context.params;
  if (!(await getMembership(authenticated, groupId, authenticated.user.id))) {
    return apiError("NOT_FOUND", "Group not found", 404);
  }

  const { data, error } = await authenticated.supabase
    .from("expenses")
    .select(
      "id, group_id, created_by, paid_by, category_id, amount_cents, description, expense_date, created_at, updated_at, expense_shares(user_id, amount_cents)",
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) return apiError("DATABASE_ERROR", "Could not load expenses", 500);

  return Response.json(
    data.map((expense) => ({
      id: expense.id,
      groupId: expense.group_id,
      createdBy: expense.created_by,
      paidBy: expense.paid_by,
      categoryId: expense.category_id,
      amountCents: expense.amount_cents,
      description: expense.description,
      expenseDate: expense.expense_date,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
      shares: expense.expense_shares.map((share) => ({
        userId: share.user_id,
        amountCents: share.amount_cents,
      })),
    })),
  );
}

export async function POST(request: Request, context: RouteContext) {
  const authenticated = await getAuthenticatedSupabase(request);
  if (!authenticated)
    return apiError("UNAUTHORIZED", "Authentication required", 401);

  const { groupId } = await context.params;
  if (!(await getMembership(authenticated, groupId, authenticated.user.id))) {
    return apiError("NOT_FOUND", "Group not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON", 422);
  }

  const parsed = expenseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Request body is invalid", 422);
  }

  const { data, error } = await authenticated.supabase.rpc("create_expense", {
    p_expense: {
      group_id: groupId,
      paid_by: parsed.data.paidBy,
      category_id: parsed.data.categoryId,
      amount_cents: parsed.data.amountCents,
      description: parsed.data.description,
      expense_date: parsed.data.expenseDate,
    },
    p_shares: parsed.data.shares.map((share) => ({
      user_id: share.userId,
      amount_cents: share.amountCents,
    })),
  });

  if (error || !data) {
    return apiError("INVALID_EXPENSE", "Could not create expense", 422);
  }

  return Response.json({ id: data }, { status: 201 });
}

import { apiError } from "@/lib/api/errors";
import {
  requireAdmin,
  requireGroupMember,
  type GroupRouteContext,
} from "@/lib/api/group-access";
import { readJsonBody } from "@/lib/api/json-body";
import { budgetProgress } from "@/lib/domain/budgets";
import { monthOf, shiftMonth } from "@/lib/domain/spending";
import { budgetQuerySchema, setBudgetSchema } from "@/lib/validation/budgets";

/**
 * Every budget in force for a month, with what was spent. A budget stays in
 * force from the month it was set until a later one replaces it. Every member
 * can read them.
 */
export async function GET(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;

  const query = budgetQuerySchema.safeParse({
    month: new URL(request.url).searchParams.get("month") ?? undefined,
  });
  if (!query.success) {
    return apiError(
      "VALIDATION_ERROR",
      query.error.issues[0]?.message ?? "Query is invalid",
      422,
    );
  }
  const month = query.data.month ?? monthOf(new Date().toISOString());

  const { data: budgets, error: budgetError } = await access.supabase
    .from("budgets")
    .select("category_id, limit_cents, effective_from, categories(name)")
    .eq("group_id", access.groupId)
    .lte("effective_from", `${month}-01`)
    .order("effective_from", { ascending: false });
  if (budgetError) {
    return apiError("DATABASE_ERROR", "Could not load budgets", 500);
  }

  const { data: expenses, error: expenseError } = await access.supabase
    .from("expenses")
    .select("category_id, amount_cents")
    .eq("group_id", access.groupId)
    .gte("expense_date", `${month}-01`)
    .lt("expense_date", `${shiftMonth(month, 1)}-01`);
  if (expenseError) {
    return apiError("DATABASE_ERROR", "Could not load expenses", 500);
  }

  const spentByCategory = new Map<string, number>();
  for (const expense of expenses) {
    if (!expense.category_id) continue;
    spentByCategory.set(
      expense.category_id,
      (spentByCategory.get(expense.category_id) ?? 0) + expense.amount_cents,
    );
  }

  // Rows come newest first, so the first one seen per category is in force.
  const inForce = new Map<string, (typeof budgets)[number]>();
  for (const budget of budgets) {
    if (!inForce.has(budget.category_id))
      inForce.set(budget.category_id, budget);
  }

  const result = [...inForce.values()]
    .map((budget) => ({
      categoryId: budget.category_id,
      categoryName: budget.categories?.name ?? "",
      effectiveFrom: budget.effective_from,
      ...budgetProgress(
        budget.limit_cents,
        spentByCategory.get(budget.category_id) ?? 0,
      ),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return Response.json(result);
}

/** Sets or changes a category's budget from a month on. Admins only. */
export async function PUT(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const access = await requireGroupMember(request, context);
  if (!access.ok) return access.response;
  const forbidden = requireAdmin(access);
  if (forbidden) return forbidden;

  const json = await readJsonBody(request);
  if (!json.ok) return json.response;
  const parsed = setBudgetSchema.safeParse(json.body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "Request body is invalid",
      422,
    );
  }

  // The category must belong to this group; RLS hides other groups' categories.
  const { data: category, error: categoryError } = await access.supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.categoryId)
    .eq("group_id", access.groupId)
    .maybeSingle();
  if (categoryError) {
    return apiError("DATABASE_ERROR", "Could not check the category", 500);
  }
  if (!category) return apiError("NOT_FOUND", "Category not found", 404);

  const { data, error } = await access.supabase
    .from("budgets")
    .upsert(
      {
        group_id: access.groupId,
        category_id: parsed.data.categoryId,
        limit_cents: parsed.data.limitCents,
        effective_from: `${parsed.data.month}-01`,
      },
      { onConflict: "group_id,category_id,effective_from" },
    )
    .select("category_id, limit_cents, effective_from")
    .single();
  if (error)
    return apiError("DATABASE_ERROR", "Could not save the budget", 500);

  return Response.json({
    categoryId: data.category_id,
    limitCents: data.limit_cents,
    effectiveFrom: data.effective_from,
  });
}

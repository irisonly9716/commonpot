import { z } from "zod";
import { apiError } from "@/lib/api/http";
import { splitEqually } from "@/lib/domain/expenses";
import { authenticateRequest } from "@/lib/db/supabase-server";
import {
  expenseInputSchema,
  type GroupExpensesResponse,
} from "@/lib/validation/expenses";

const groupIdSchema = z.uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId: rawGroupId } = await params;
  const groupId = groupIdSchema.safeParse(rawGroupId);
  if (!groupId.success) {
    return apiError(400, "invalid_group_id", "The group ID is not valid.");
  }

  const auth = await authenticateRequest();
  if (auth instanceof Response) {
    return auth;
  }

  const { data: group, error: groupError } = await auth.supabase
    .from("groups")
    .select("name, currency")
    .eq("id", groupId.data)
    .maybeSingle();
  if (groupError) {
    console.error("Could not load group:", groupError.message);
    return apiError(500, "group_load_failed", "The group could not be loaded.");
  }
  if (!group) {
    return apiError(404, "group_not_found", "This group could not be found.");
  }

  const { data: memberRows, error: membersError } = await auth.supabase
    .from("group_members")
    .select("user_id, display_name")
    .eq("group_id", groupId.data)
    .order("display_name", { ascending: true });
  if (membersError) {
    console.error("Could not load group members:", membersError.message);
    return apiError(
      500,
      "members_load_failed",
      "Group members could not be loaded.",
    );
  }

  const { data: expenseRows, error: expensesError } = await auth.supabase
    .from("expenses")
    .select(
      "id, description, category, amount_cents, expense_date, split_type, paid_by_user_id, created_at",
    )
    .eq("group_id", groupId.data)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (expensesError) {
    console.error("Could not load group expenses:", expensesError.message);
    return apiError(
      500,
      "expenses_load_failed",
      "Group expenses could not be loaded.",
    );
  }

  const expenseIds = expenseRows.map((expense) => expense.id);
  const sharesByExpense = new Map<
    string,
    { userId: string; amountCents: number }[]
  >();
  if (expenseIds.length > 0) {
    const { data: shareRows, error: sharesError } = await auth.supabase
      .from("expense_shares")
      .select("expense_id, user_id, amount_cents")
      .in("expense_id", expenseIds);
    if (sharesError) {
      console.error("Could not load expense shares:", sharesError.message);
      return apiError(
        500,
        "shares_load_failed",
        "Expense shares could not be loaded.",
      );
    }
    for (const share of shareRows) {
      const shares = sharesByExpense.get(share.expense_id) ?? [];
      shares.push({ userId: share.user_id, amountCents: share.amount_cents });
      sharesByExpense.set(share.expense_id, shares);
    }
  }

  const response: GroupExpensesResponse = {
    group,
    currentUserId: auth.userId,
    members: memberRows.map((member) => ({
      userId: member.user_id,
      displayName: member.display_name,
    })),
    expenses: expenseRows.map((expense) => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amountCents: expense.amount_cents,
      expenseDate: expense.expense_date,
      splitType: expense.split_type,
      paidByUserId: expense.paid_by_user_id,
      createdAt: expense.created_at,
      shares: sharesByExpense.get(expense.id) ?? [],
    })),
  };

  return Response.json(response);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId: rawGroupId } = await params;
  const groupId = groupIdSchema.safeParse(rawGroupId);
  if (!groupId.success) {
    return apiError(400, "invalid_group_id", "The group ID is not valid.");
  }

  const auth = await authenticateRequest();
  if (auth instanceof Response) {
    return auth;
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError(400, "invalid_json", "The request body must be valid JSON.");
    }
    throw error;
  }

  const input = expenseInputSchema.safeParse(requestBody);
  if (!input.success) {
    return Response.json(
      {
        error: {
          code: "invalid_expense",
          message: input.error.issues[0]?.message ?? "The expense is not valid.",
          issues: input.error.issues,
        },
      },
      { status: 422 },
    );
  }

  const { data: group, error: groupError } = await auth.supabase
    .from("groups")
    .select("id")
    .eq("id", groupId.data)
    .maybeSingle();
  if (groupError) {
    console.error("Could not verify group membership:", groupError.message);
    return apiError(500, "group_check_failed", "Group access could not be checked.");
  }
  if (!group) {
    return apiError(404, "group_not_found", "This group could not be found.");
  }

  const { data: memberRows, error: membersError } = await auth.supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId.data);
  if (membersError) {
    console.error("Could not verify group members:", membersError.message);
    return apiError(
      500,
      "members_load_failed",
      "Group members could not be loaded.",
    );
  }

  const memberIds = new Set(memberRows.map((member) => member.user_id));
  const requestedMemberIds = [
    input.data.paidByUserId,
    ...input.data.participantUserIds,
  ];
  if (requestedMemberIds.some((userId) => !memberIds.has(userId))) {
    return apiError(
      422,
      "invalid_group_member",
      "The payer and every selected participant must belong to this group.",
    );
  }

  const shares =
    input.data.splitType === "equal"
      ? splitEqually(input.data.amountCents, input.data.participantUserIds)
      : input.data.exactShares;
  if (!shares) {
    return apiError(
      422,
      "invalid_exact_shares",
      "Enter a share for every selected member.",
    );
  }

  const { data: expenseId, error: createError } = await auth.supabase.rpc(
    "create_group_expense",
    {
      p_group_id: groupId.data,
      p_description: input.data.description,
      p_category: input.data.category,
      p_expense_date: input.data.expenseDate,
      p_amount_cents: input.data.amountCents,
      p_split_type: input.data.splitType,
      p_paid_by_user_id: input.data.paidByUserId,
      p_shares: shares.map((share) => ({
        user_id: share.userId,
        amount_cents: share.amountCents,
      })),
    },
  );
  if (createError) {
    if (createError.code === "42501") {
      return apiError(403, "forbidden", "You cannot add expenses to this group.");
    }
    if (createError.code === "22023" || createError.code === "23514") {
      return apiError(
        422,
        "invalid_expense",
        "The expense or its shares are not valid.",
      );
    }
    console.error("Could not create group expense:", createError.message);
    return apiError(
      500,
      "expense_create_failed",
      "The expense could not be saved.",
    );
  }

  return Response.json({ expenseId }, { status: 201 });
}

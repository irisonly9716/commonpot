import { beforeAll, describe, expect, it } from "vitest";

import {
  GET as listBudgets,
  PUT as setBudget,
} from "@/app/api/v1/groups/[groupId]/budgets/route";
import { GET as listCategories } from "@/app/api/v1/groups/[groupId]/categories/route";
import { POST as createExpense } from "@/app/api/v1/groups/[groupId]/expenses/route";
import { POST as createInvite } from "@/app/api/v1/groups/[groupId]/invites/route";
import { POST as createGroup } from "@/app/api/v1/groups/route";
import { POST as acceptInvite } from "@/app/api/v1/invites/accept/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type Session = { token: string; userId: string };

async function signUp(): Promise<Session> {
  const email = `budgets-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      data: { display_name: email.slice(0, 12) },
    }),
  });
  const body = (await response.json()) as {
    access_token: string;
    user: { id: string };
  };
  return { token: body.access_token, userId: body.user.id };
}

function call(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (groupId: string) => ({ params: Promise.resolve({ groupId }) });
const MONTH = "2026-11";

let admin: Session;
let member: Session;
let outsider: Session;
let groupId: string;
let categoryId: string;

async function spend(cents: number): Promise<void> {
  const response = await createExpense(
    call("POST", `/api/v1/groups/${groupId}/expenses`, member.token, {
      amountCents: cents,
      description: "Budget test",
      categoryId,
      expenseDate: `${MONTH}-10`,
      paidBy: member.userId,
      shares: [{ userId: member.userId, amountCents: cents }],
    }),
    ctx(groupId),
  );
  expect(response.status).toBe(201);
}

beforeAll(async () => {
  [admin, member, outsider] = await Promise.all([signUp(), signUp(), signUp()]);
  const created = await createGroup(
    call("POST", "/api/v1/groups", admin.token, {
      name: `Budgets test ${Date.now()}`,
      currency: "USD",
    }),
  );
  groupId = ((await created.json()) as { id: string }).id;
  const invite = await createInvite(
    call("POST", `/api/v1/groups/${groupId}/invites`, admin.token),
    ctx(groupId),
  );
  const { token } = (await invite.json()) as { token: string };
  await acceptInvite(
    call("POST", "/api/v1/invites/accept", member.token, { token }),
  );
  const categories = await listCategories(
    call("GET", `/api/v1/groups/${groupId}/categories`, admin.token),
    ctx(groupId),
  );
  categoryId = ((await categories.json()) as Array<{ id: string }>)[0].id;
});

describe("US7 budgets API", () => {
  it("answers 401 without a token", async () => {
    const response = await listBudgets(
      call("GET", `/api/v1/groups/${groupId}/budgets`),
      ctx(groupId),
    );
    expect(response.status).toBe(401);
  });

  it("answers 404 for someone outside the group", async () => {
    const response = await listBudgets(
      call("GET", `/api/v1/groups/${groupId}/budgets`, outsider.token),
      ctx(groupId),
    );
    expect(response.status).toBe(404);
  });

  it("lets only a group admin set a budget", async () => {
    const body = { categoryId, limitCents: 10_000, month: MONTH };
    const asMember = await setBudget(
      call("PUT", `/api/v1/groups/${groupId}/budgets`, member.token, body),
      ctx(groupId),
    );
    expect(asMember.status).toBe(403);
    const asAdmin = await setBudget(
      call("PUT", `/api/v1/groups/${groupId}/budgets`, admin.token, body),
      ctx(groupId),
    );
    expect(asAdmin.status).toBe(200);
  });

  it("validates the body", async () => {
    for (const body of [
      { categoryId, limitCents: 0, month: MONTH },
      { categoryId, limitCents: 10.5, month: MONTH },
      { categoryId: "not-a-uuid", limitCents: 100, month: MONTH },
      { categoryId, limitCents: 100, month: "2026-13" },
    ]) {
      const response = await setBudget(
        call("PUT", `/api/v1/groups/${groupId}/budgets`, admin.token, body),
        ctx(groupId),
      );
      expect(response.status, JSON.stringify(body)).toBe(422);
    }
  });

  it("shows every member the spent, left, percent and status for the month", async () => {
    await spend(8_500);
    const response = await listBudgets(
      call(
        "GET",
        `/api/v1/groups/${groupId}/budgets?month=${MONTH}`,
        member.token,
      ),
      ctx(groupId),
    );
    expect(response.status).toBe(200);
    const budgets = (await response.json()) as Array<Record<string, unknown>>;
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toMatchObject({
      categoryId,
      limitCents: 10_000,
      spentCents: 8_500,
      leftCents: 1_500,
      percent: 85,
      status: "warning",
    });
  });

  it("changes the limit when the admin sets it again", async () => {
    const set = await setBudget(
      call("PUT", `/api/v1/groups/${groupId}/budgets`, admin.token, {
        categoryId,
        limitCents: 8_500,
        month: MONTH,
      }),
      ctx(groupId),
    );
    expect(set.status).toBe(200);
    const response = await listBudgets(
      call(
        "GET",
        `/api/v1/groups/${groupId}/budgets?month=${MONTH}`,
        admin.token,
      ),
      ctx(groupId),
    );
    const budgets = (await response.json()) as Array<Record<string, unknown>>;
    expect(budgets[0]).toMatchObject({ limitCents: 8_500, status: "over" });
  });

  it("starts a past or later month fresh and keeps the old one", async () => {
    const response = await listBudgets(
      call(
        "GET",
        `/api/v1/groups/${groupId}/budgets?month=2026-12`,
        admin.token,
      ),
      ctx(groupId),
    );
    const budgets = (await response.json()) as Array<Record<string, unknown>>;
    expect(budgets[0]).toMatchObject({ spentCents: 0, status: "ok" });
  });

  it("refuses a category that belongs to another group", async () => {
    const other = await createGroup(
      call("POST", "/api/v1/groups", outsider.token, {
        name: `Other group ${Date.now()}`,
        currency: "USD",
      }),
    );
    const otherId = ((await other.json()) as { id: string }).id;
    const otherCategories = await listCategories(
      call("GET", `/api/v1/groups/${otherId}/categories`, outsider.token),
      ctx(otherId),
    );
    const foreignCategory = (
      (await otherCategories.json()) as Array<{ id: string }>
    )[0].id;
    const response = await setBudget(
      call("PUT", `/api/v1/groups/${groupId}/budgets`, admin.token, {
        categoryId: foreignCategory,
        limitCents: 5_000,
        month: MONTH,
      }),
      ctx(groupId),
    );
    expect(response.status).toBe(404);
  });
});

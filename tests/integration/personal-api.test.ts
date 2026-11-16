import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { DELETE as deleteGroupExpense } from "@/app/api/v1/groups/[groupId]/expenses/[expenseId]/route";
import { POST as postGroupExpense } from "@/app/api/v1/groups/[groupId]/expenses/route";
import { GET as getSpending } from "@/app/api/v1/me/spending/route";
import {
  DELETE as deletePersonal,
  PATCH as patchPersonal,
} from "@/app/api/v1/personal-expenses/[expenseId]/route";
import {
  GET as listPersonal,
  POST as postPersonal,
} from "@/app/api/v1/personal-expenses/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  member: "22222222-2222-4222-8222-222222222222",
};
const users = {
  admin: "admin@example.com",
  member: "member@example.com",
  siteAdmin: "site-admin@example.com",
};
type PersonalExpense = {
  id: string;
  amountCents: number;
  description: string;
  category: string;
  expenseDate: string;
};

type Breakdown = { key: string; label: string; amountCents: number };
type Spending = {
  month: string;
  currencies: Array<{
    currency: string;
    totalCents: number;
    byCategory: Breakdown[];
    bySource: Breakdown[];
    trend: Array<{ month: string; amountCents: number }>;
  }>;
};

async function signIn(email: string): Promise<string> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    },
  );
  const body = (await response.json()) as { access_token: string };
  expect(response.ok).toBe(true);
  return body.access_token;
}

function apiRequest(
  path: string,
  token: string | undefined,
  method = "GET",
  body?: unknown,
): Request {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function expenseContext(expenseId: string) {
  return { params: Promise.resolve({ expenseId }) };
}

async function createPersonal(
  token: string,
  body: Partial<PersonalExpense> = {},
): Promise<PersonalExpense> {
  const response = await postPersonal(
    apiRequest("/api/v1/personal-expenses", token, "POST", {
      amountCents: 1234,
      description: `Notebook ${crypto.randomUUID()}`,
      category: "School",
      expenseDate: "2026-06-15",
      ...body,
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as PersonalExpense;
}

async function listFor(token: string, month: string) {
  const response = await listPersonal(
    apiRequest(`/api/v1/personal-expenses?month=${month}`, token),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as PersonalExpense[];
}

async function spendingFor(token: string, month: string): Promise<Spending> {
  const response = await getSpending(
    apiRequest(`/api/v1/me/spending?month=${month}`, token),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as Spending;
}

function usd(spending: Spending) {
  const entry = spending.currencies.find((item) => item.currency === "USD");
  if (!entry) throw new Error("no USD totals");
  return entry;
}

function amountOf(rows: Breakdown[], key: string) {
  return rows.find((row) => row.key === key)?.amountCents ?? 0;
}

describe("US10 my personal ledger: API", () => {
  it("logs, lists, edits and deletes a personal expense", async () => {
    const token = await signIn(users.member);
    const created = await createPersonal(token);
    expect(created).toMatchObject({
      amountCents: 1234,
      category: "School",
      expenseDate: "2026-06-15",
    });

    expect((await listFor(token, "2026-06")).map((item) => item.id)).toContain(
      created.id,
    );
    expect(
      (await listFor(token, "2026-05")).map((item) => item.id),
    ).not.toContain(created.id);

    const patch = await patchPersonal(
      apiRequest(`/api/v1/personal-expenses/${created.id}`, token, "PATCH", {
        amountCents: 1500,
        description: "Notebook and pens",
        category: "School",
        expenseDate: "2026-06-16",
      }),
      expenseContext(created.id),
    );
    expect(patch.status).toBe(200);
    expect(await patch.json()).toMatchObject({
      id: created.id,
      amountCents: 1500,
      description: "Notebook and pens",
      expenseDate: "2026-06-16",
    });

    const removal = await deletePersonal(
      apiRequest(`/api/v1/personal-expenses/${created.id}`, token, "DELETE"),
      expenseContext(created.id),
    );
    expect(removal.status).toBe(204);
    expect(
      (await listFor(token, "2026-06")).map((item) => item.id),
    ).not.toContain(created.id);
  });

  it("answers 401 without a token", async () => {
    const id = crypto.randomUUID();
    const responses = await Promise.all([
      listPersonal(apiRequest("/api/v1/personal-expenses", undefined)),
      postPersonal(
        apiRequest("/api/v1/personal-expenses", undefined, "POST", {}),
      ),
      patchPersonal(
        apiRequest(`/api/v1/personal-expenses/${id}`, undefined, "PATCH", {}),
        expenseContext(id),
      ),
      deletePersonal(
        apiRequest(`/api/v1/personal-expenses/${id}`, undefined, "DELETE"),
        expenseContext(id),
      ),
      getSpending(apiRequest("/api/v1/me/spending?month=2026-11", undefined)),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: "UNAUTHORIZED", message: expect.any(String) },
      });
    }
  });

  it("answers 422 for bad input", async () => {
    const token = await signIn(users.member);
    const badBody = await postPersonal(
      apiRequest("/api/v1/personal-expenses", token, "POST", {
        amountCents: 0,
        description: "",
        category: "School",
        expenseDate: "2026-06-15",
      }),
    );
    expect(badBody.status).toBe(422);

    const badMonth = await listPersonal(
      apiRequest("/api/v1/personal-expenses?month=2026-13", token),
    );
    expect(badMonth.status).toBe(422);

    const missingMonth = await getSpending(
      apiRequest("/api/v1/me/spending", token),
    );
    expect(missingMonth.status).toBe(422);

    const badId = await deletePersonal(
      apiRequest("/api/v1/personal-expenses/not-a-uuid", token, "DELETE"),
      expenseContext("not-a-uuid"),
    );
    expect(badId.status).toBe(422);
    expect(await badId.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("keeps the ledger private, even from group and site admins", async () => {
    const memberToken = await signIn(users.member);
    const mine = await createPersonal(memberToken, {
      expenseDate: "2026-06-20",
    });

    for (const email of [users.admin, users.siteAdmin]) {
      const token = await signIn(email);
      expect(
        (await listFor(token, "2026-06")).map((item) => item.id),
      ).not.toContain(mine.id);

      const patch = await patchPersonal(
        apiRequest(`/api/v1/personal-expenses/${mine.id}`, token, "PATCH", {
          amountCents: 1,
          description: "Changed by someone else",
          category: "School",
          expenseDate: "2026-06-20",
        }),
        expenseContext(mine.id),
      );
      expect(patch.status).toBe(404);

      const removal = await deletePersonal(
        apiRequest(`/api/v1/personal-expenses/${mine.id}`, token, "DELETE"),
        expenseContext(mine.id),
      );
      expect(removal.status).toBe(404);

      // Straight to the database with their own token: row level security.
      const direct = createClient(supabaseUrl, anonKey, {
        accessToken: async () => token,
      });
      const { data } = await direct
        .from("personal_expenses")
        .select("id")
        .eq("id", mine.id);
      expect(data).toEqual([]);
    }

    const stillThere = await listFor(memberToken, "2026-06");
    expect(stillThere.find((item) => item.id === mine.id)).toMatchObject({
      amountCents: 1234,
    });
    await deletePersonal(
      apiRequest(`/api/v1/personal-expenses/${mine.id}`, memberToken, "DELETE"),
      expenseContext(mine.id),
    );
  });

  it("adds my share of group expenses to my personal spending", async () => {
    const memberToken = await signIn(users.member);
    const adminToken = await signIn(users.admin);
    const month = "2026-07";
    const memberBefore = usd(await spendingFor(memberToken, month));
    const adminBefore = usd(await spendingFor(adminToken, month));

    const personal = await createPersonal(memberToken, {
      amountCents: 1000,
      category: "Books",
      expenseDate: "2026-07-05",
    });
    // The admin pays 12.00 up front and each of them owes 6.00.
    const groupResponse = await postGroupExpense(
      apiRequest(`/api/v1/groups/${groupId}/expenses`, adminToken, "POST", {
        amountCents: 1200,
        description: `Shared dinner ${crypto.randomUUID()}`,
        categoryId: null,
        expenseDate: "2026-07-10",
        paidBy: ids.admin,
        shares: [
          { userId: ids.admin, amountCents: 600 },
          { userId: ids.member, amountCents: 600 },
        ],
      }),
      { params: Promise.resolve({ groupId }) },
    );
    expect(groupResponse.status).toBe(201);
    const groupExpenseId = ((await groupResponse.json()) as { id: string }).id;

    const memberAfter = usd(await spendingFor(memberToken, month));
    expect(memberAfter.totalCents - memberBefore.totalCents).toBe(1600);
    expect(
      amountOf(memberAfter.bySource, "personal") -
        amountOf(memberBefore.bySource, "personal"),
    ).toBe(1000);
    expect(
      amountOf(memberAfter.bySource, groupId) -
        amountOf(memberBefore.bySource, groupId),
    ).toBe(600);
    expect(
      amountOf(memberAfter.byCategory, "Books") -
        amountOf(memberBefore.byCategory, "Books"),
    ).toBe(1000);
    expect(
      amountOf(memberAfter.byCategory, "Uncategorized") -
        amountOf(memberBefore.byCategory, "Uncategorized"),
    ).toBe(600);
    expect(memberAfter.trend.at(-1)).toEqual({
      month,
      amountCents: memberAfter.totalCents,
    });

    // The admin paid 12.00 but only their 6.00 share counts.
    const adminAfter = usd(await spendingFor(adminToken, month));
    expect(adminAfter.totalCents - adminBefore.totalCents).toBe(600);

    await deletePersonal(
      apiRequest(
        `/api/v1/personal-expenses/${personal.id}`,
        memberToken,
        "DELETE",
      ),
      expenseContext(personal.id),
    );
    await deleteGroupExpense(
      apiRequest(
        `/api/v1/groups/${groupId}/expenses/${groupExpenseId}`,
        adminToken,
        "DELETE",
      ),
      { params: Promise.resolve({ groupId, expenseId: groupExpenseId }) },
    );
  });
});

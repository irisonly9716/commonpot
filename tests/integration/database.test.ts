import { describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const expenseId = "33333333-3333-4333-8333-333333333333";
const personalExpenseId = "44444444-4444-4444-8444-444444444444";
const userPassword = "password123";

const users = {
  admin: "admin@example.com",
  member: "member@example.com",
  siteAdmin: "site-admin@example.com",
};

async function signIn(email: string): Promise<string> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password: userPassword }),
    },
  );
  expect(response.ok, await response.text()).toBe(true);
  const body = (await response.json()) as { access_token: string };
  return body.access_token;
}

async function request(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

async function rpc(
  functionName: string,
  token: string,
  body: unknown,
): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("issue #4 database security and integrity", () => {
  it("isolates groups and personal ledgers by user membership", async () => {
    const memberToken = await signIn(users.member);

    const groups = await request(
      "groups?select=id&id=eq.11111111-1111-4111-8111-111111111111",
      memberToken,
    );
    expect(groups.ok).toBe(true);
    expect(await groups.json()).toHaveLength(1);

    const otherGroup = await request(
      "groups?select=id&id=eq.99999999-9999-4999-8999-999999999999",
      memberToken,
    );
    expect(otherGroup.ok).toBe(true);
    expect(await otherGroup.json()).toHaveLength(0);

    const ownLedger = await request(
      `personal_expenses?select=id&id=eq.${personalExpenseId}`,
      memberToken,
    );
    expect(ownLedger.ok).toBe(true);
    expect(await ownLedger.json()).toHaveLength(0);

    const adminToken = await signIn(users.admin);
    const otherLedger = await request(
      `personal_expenses?select=id&id=eq.${personalExpenseId}`,
      adminToken,
    );
    expect(otherLedger.ok).toBe(true);
    expect(await otherLedger.json()).toHaveLength(1);
  });

  it("prevents privilege escalation and direct membership insertion", async () => {
    const memberToken = await signIn(users.member);

    const profileUpdate = await request(
      "profiles?id=eq.22222222-2222-4222-8222-222222222222",
      memberToken,
      {
        method: "PATCH",
        body: JSON.stringify({
          is_site_admin: true,
          suspended_at: new Date().toISOString(),
        }),
      },
    );
    expect(profileUpdate.status).toBeGreaterThanOrEqual(400);

    const roleUpdate = await request(
      `group_members?group_id=eq.${groupId}&user_id=eq.22222222-2222-4222-8222-222222222222`,
      memberToken,
      {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      },
    );
    expect(roleUpdate.status).toBeGreaterThanOrEqual(400);

    const directJoin = await request("group_members", memberToken, {
      method: "POST",
      body: JSON.stringify({
        group_id: groupId,
        user_id: "33333333-3333-4333-8333-333333333333",
        role: "member",
      }),
    });
    expect(directJoin.status).toBeGreaterThanOrEqual(400);
  });

  it("allows only the creator to edit and an admin to delete an expense", async () => {
    const memberToken = await signIn(users.member);
    const memberEdit = await request(
      `expenses?id=eq.${expenseId}`,
      memberToken,
      {
        method: "PATCH",
        body: JSON.stringify({ description: "tampered" }),
      },
    );
    expect(memberEdit.status).toBeGreaterThanOrEqual(400);

    const adminToken = await signIn(users.admin);
    const adminDelete = await request(
      `expenses?id=eq.${expenseId}`,
      adminToken,
      {
        method: "DELETE",
      },
    );
    expect(adminDelete.ok).toBe(true);
  });

  it("requires atomic expense creation and validates shares and relationships", async () => {
    const adminToken = await signIn(users.admin);

    const directInsert = await request("expenses", adminToken, {
      method: "POST",
      body: JSON.stringify({
        id: "55555555-5555-4555-8555-555555555555",
        group_id: groupId,
        created_by: "11111111-1111-4111-8111-111111111111",
        paid_by: "11111111-1111-4111-8111-111111111111",
        amount_cents: 100,
        description: "without shares",
        expense_date: "2026-11-01",
      }),
    });
    expect(directInsert.status).toBeGreaterThanOrEqual(400);

    const created = await rpc("create_expense", adminToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "11111111-1111-4111-8111-111111111111",
        amount_cents: 101,
        description: "atomic expense",
        expense_date: "2026-11-02",
      },
      p_shares: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          amount_cents: 51,
        },
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          amount_cents: 50,
        },
      ],
    });
    expect(created.ok).toBe(true);
  });

  it("does not expose operational details to site admins", async () => {
    const siteAdminToken = await signIn(users.siteAdmin);
    for (const table of [
      "expenses",
      "expense_shares",
      "payments",
      "budgets",
      "alerts",
      "activity",
      "personal_expenses",
    ]) {
      const response = await request(`${table}?select=*`, siteAdminToken);
      expect(response.ok).toBe(true);
      expect(await response.json()).toEqual([]);
    }

    const profiles = await request(
      "profiles?select=id,is_site_admin",
      siteAdminToken,
    );
    expect(profiles.ok).toBe(true);
    expect(await profiles.json()).not.toHaveLength(0);
  });
});

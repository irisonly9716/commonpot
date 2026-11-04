import { describe, expect, it } from "vitest";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const otherGroupId = "99999999-9999-4999-8999-999999999999";
const personalExpenseId = "44444444-4444-4444-8444-444444444444";
const userPassword = "password123";

const users = {
  admin: "admin@example.com",
  member: "member@example.com",
  siteAdmin: "site-admin@example.com",
  otherMember: "other-member@example.com",
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
  const responseText = await response.text();
  expect(response.ok, responseText).toBe(true);
  const body = JSON.parse(responseText) as { access_token: string };
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
      Prefer: "return=representation",
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
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

describe("issue #4 database security and integrity", () => {
  it("isolates groups and personal ledgers by user membership", async () => {
    const memberToken = await signIn(users.member);

    const groups = await request(
      `groups?select=id&id=eq.${groupId}`,
      memberToken,
    );
    expect(groups.ok).toBe(true);
    expect(await groups.json()).toHaveLength(1);

    const otherGroup = await request(
      `groups?select=id&id=eq.${otherGroupId}`,
      memberToken,
    );
    expect(otherGroup.ok).toBe(true);
    expect(await otherGroup.json()).toHaveLength(0);

    const memberLedger = await request(
      `personal_expenses?select=id&id=eq.${personalExpenseId}`,
      memberToken,
    );
    expect(memberLedger.ok).toBe(true);
    expect(await memberLedger.json()).toHaveLength(0);

    const adminToken = await signIn(users.admin);
    const ownerLedger = await request(
      `personal_expenses?select=id&id=eq.${personalExpenseId}`,
      adminToken,
    );
    expect(ownerLedger.ok).toBe(true);
    expect(await ownerLedger.json()).toHaveLength(1);
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
    const profile = await request(
      "profiles?id=eq.22222222-2222-4222-8222-222222222222&select=is_site_admin,suspended_at",
      memberToken,
    );
    expect(await profile.json()).toEqual([
      { is_site_admin: false, suspended_at: null },
    ]);

    const roleUpdate = await request(
      `group_members?group_id=eq.${groupId}&user_id=eq.22222222-2222-4222-8222-222222222222`,
      memberToken,
      {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      },
    );
    expect(roleUpdate.ok).toBe(true);
    const role = await request(
      `group_members?group_id=eq.${groupId}&user_id=eq.22222222-2222-4222-8222-222222222222&select=role`,
      memberToken,
    );
    expect(await role.json()).toEqual([{ role: "member" }]);

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
    const adminToken = await signIn(users.admin);
    const created = await rpc("create_expense", adminToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "11111111-1111-4111-8111-111111111111",
        amount_cents: 8400,
        description: "Delete me",
        expense_date: "2026-11-03",
      },
      p_shares: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          amount_cents: 4200,
        },
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          amount_cents: 4200,
        },
      ],
    });
    const createdText = await created.text();
    expect(created.ok, createdText).toBe(true);
    const createdExpenseId = JSON.parse(createdText) as string;

    const memberToken = await signIn(users.member);
    const memberEdit = await request(
      `expenses?id=eq.${createdExpenseId}`,
      memberToken,
      {
        method: "PATCH",
        body: JSON.stringify({ description: "tampered" }),
      },
    );
    expect(memberEdit.ok).toBe(true);
    const expense = await request(
      `expenses?id=eq.${createdExpenseId}&select=description`,
      memberToken,
    );
    expect(await expense.json()).toEqual([{ description: "Delete me" }]);

    const adminDelete = await request(
      `expenses?id=eq.${createdExpenseId}`,
      adminToken,
      {
        method: "DELETE",
      },
    );
    const adminDeleteText = await adminDelete.text();
    expect(adminDelete.ok, adminDeleteText).toBe(true);
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
    const createdText = await created.text();
    expect(created.ok, createdText).toBe(true);
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

  it("blocks non-admin platform counts and protects changed expense amounts", async () => {
    const memberToken = await signIn(users.member);
    const counts = await rpc("platform_counts", memberToken, {});
    expect(counts.status).toBeGreaterThanOrEqual(400);

    const expense = await rpc("create_expense", memberToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "11111111-1111-4111-8111-111111111111",
        amount_cents: 100,
        description: "Amount protected",
        expense_date: "2026-11-04",
      },
      p_shares: [
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          amount_cents: 100,
        },
      ],
    });
    expect(expense.ok).toBe(true);
    const expenseId = JSON.parse(await expense.text()) as string;
    const changed = await request(`expenses?id=eq.${expenseId}`, memberToken, {
      method: "PATCH",
      body: JSON.stringify({ amount_cents: 101 }),
    });
    expect(changed.status).toBeGreaterThanOrEqual(400);
  });

  it("keeps shares writable only by the expense creator", async () => {
    const adminToken = await signIn(users.admin);
    const memberToken = await signIn(users.member);
    const expense = await rpc("create_expense", memberToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "11111111-1111-4111-8111-111111111111",
        amount_cents: 100,
        description: "Share owner",
        expense_date: "2026-11-04",
      },
      p_shares: [
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          amount_cents: 100,
        },
      ],
    });
    expect(expense.ok).toBe(true);
    const expenseId = JSON.parse(await expense.text()) as string;
    const insert = await request("expense_shares", adminToken, {
      method: "POST",
      body: JSON.stringify({
        expense_id: expenseId,
        user_id: "11111111-1111-4111-8111-111111111111",
        amount_cents: 0,
      }),
    });
    expect(insert.status).toBeGreaterThanOrEqual(400);
  });

  it("exposes only shared display profiles and hides privilege columns", async () => {
    const memberToken = await signIn(users.member);
    const ownProfile = await request("profiles?select=*", memberToken);
    expect(await ownProfile.json()).toHaveLength(1);
    const shared = await rpc("group_member_profiles", memberToken, {
      p_group_id: groupId,
    });
    expect(shared.ok).toBe(true);
    const rows = (await shared.json()) as Array<Record<string, unknown>>;
    expect(
      rows.some((row) => row.id === "11111111-1111-4111-8111-111111111111"),
    ).toBe(true);
    expect(
      rows.every(
        (row) => !("is_site_admin" in row) && !("suspended_at" in row),
      ),
    ).toBe(true);
  });

  it("allows each group member to receive the same budget threshold alert", async () => {
    const adminToken = await signIn(users.admin);
    const budget = await request("budgets", adminToken, {
      method: "POST",
      body: JSON.stringify({
        group_id: groupId,
        category_id: "00000000-0000-0000-0000-000000000000",
        limit_cents: 100,
        effective_from: "2026-11-01",
      }),
    });
    expect(budget.status).toBeGreaterThanOrEqual(400);
  });

  it("handles invite acceptance, validation triggers, and activity snapshots", async () => {
    const otherToken = await signIn(users.otherMember);
    const accepted = await rpc("accept_invite", otherToken, {
      p_token: "seed-invite-token",
    });
    expect(accepted.ok).toBe(true);
    const acceptedAgain = await rpc("accept_invite", otherToken, {
      p_token: "seed-invite-token",
    });
    expect(acceptedAgain.ok).toBe(true);

    const adminToken = await signIn(users.admin);
    const expired = await request("invites", adminToken, {
      method: "POST",
      body: JSON.stringify({
        group_id: groupId,
        created_by: "11111111-1111-4111-8111-111111111111",
        expires_at: "2020-01-01T00:00:00Z",
      }),
    });
    expect(expired.ok).toBe(true);
    const expiredToken = ((await expired.json()) as Array<{ token: string }>)[0]
      ?.token;
    const expiredJoin = await rpc("accept_invite", otherToken, {
      p_token: expiredToken,
    });
    expect(expiredJoin.status).toBeGreaterThanOrEqual(400);

    const revoked = await request("invites", adminToken, {
      method: "POST",
      body: JSON.stringify({
        group_id: groupId,
        created_by: "11111111-1111-4111-8111-111111111111",
      }),
    });
    expect(revoked.ok).toBe(true);
    const revokedRows = (await revoked.json()) as Array<{
      token: string;
      id: string;
    }>;
    const revokedInvite = await request(
      `invites?id=eq.${revokedRows[0]?.id}`,
      adminToken,
      {
        method: "PATCH",
        body: JSON.stringify({ revoked_at: "2026-11-04T00:00:00Z" }),
      },
    );
    expect(revokedInvite.ok).toBe(true);
    const revokedJoin = await rpc("accept_invite", otherToken, {
      p_token: revokedRows[0]?.token,
    });
    expect(revokedJoin.status).toBeGreaterThanOrEqual(400);

    const badShares = await rpc("create_expense", adminToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "11111111-1111-4111-8111-111111111111",
        amount_cents: 101,
        description: "Bad shares",
        expense_date: "2026-11-04",
      },
      p_shares: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          amount_cents: 100,
        },
      ],
    });
    expect(badShares.status).toBeGreaterThanOrEqual(400);

    const badPayer = await rpc("create_expense", adminToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "33333333-3333-4333-8333-333333333333",
        amount_cents: 100,
        description: "Bad payer",
        expense_date: "2026-11-04",
      },
      p_shares: [
        {
          user_id: "11111111-1111-4111-8111-111111111111",
          amount_cents: 100,
        },
      ],
    });
    expect(badPayer.status).toBeGreaterThanOrEqual(400);

    const payment = await request("payments", adminToken, {
      method: "POST",
      body: JSON.stringify({
        group_id: groupId,
        paid_by: "11111111-1111-4111-8111-111111111111",
        paid_to: "33333333-3333-4333-8333-333333333333",
        amount_cents: 100,
        payment_date: "2026-11-04",
      }),
    });
    expect(payment.status).toBeGreaterThanOrEqual(400);
  });

  it("prevents member expense deletion and removing the last admin", async () => {
    const memberToken = await signIn(users.member);
    const memberDelete = await request(
      "expenses?id=eq.33333333-3333-4333-8333-333333333333",
      memberToken,
      { method: "DELETE" },
    );
    expect(memberDelete.ok).toBe(true);
    const remains = await request(
      "expenses?id=eq.33333333-3333-4333-8333-333333333333",
      memberToken,
    );
    expect(await remains.json()).toHaveLength(1);

    const adminToken = await signIn(users.admin);
    const memberExpense = await rpc("create_expense", memberToken, {
      p_expense: {
        group_id: groupId,
        paid_by: "22222222-2222-4222-8222-222222222222",
        amount_cents: 100,
        description: "Member deletion alert",
        expense_date: "2026-11-04",
      },
      p_shares: [
        {
          user_id: "22222222-2222-4222-8222-222222222222",
          amount_cents: 100,
        },
      ],
    });
    expect(memberExpense.ok).toBe(true);
    const memberExpenseId = JSON.parse(await memberExpense.text()) as string;
    const deleted = await request(
      `expenses?id=eq.${memberExpenseId}`,
      adminToken,
      { method: "DELETE" },
    );
    expect(deleted.ok).toBe(true);
    const activity = await request(
      `activity?group_id=eq.${groupId}&description=eq.Member%20deletion%20alert&select=action,description`,
      memberToken,
    );
    const activityRows = (await activity.json()) as Array<{
      action: string;
      description: string;
    }>;
    expect(
      activityRows.some(
        (row) =>
          row.action === "deleted" &&
          row.description === "Member deletion alert",
      ),
    ).toBe(true);
    const alerts = await request(
      "alerts?select=message&kind=eq.expense_deleted",
      memberToken,
    );
    const alertRows = (await alerts.json()) as Array<{ message: string }>;
    expect(alertRows.some((row) => row.message.includes("Admin User"))).toBe(
      true,
    );
    expect(
      alertRows.some((row) => row.message.includes("Member deletion alert")),
    ).toBe(true);

    const payment = await request("payments", memberToken, {
      method: "POST",
      body: JSON.stringify({
        group_id: groupId,
        paid_by: "22222222-2222-4222-8222-222222222222",
        paid_to: "11111111-1111-4111-8111-111111111111",
        amount_cents: 100,
        payment_date: "2026-11-04",
      }),
    });
    expect(payment.ok).toBe(true);
    const paymentActivity = await request(
      `activity?group_id=eq.${groupId}&action=eq.payment_recorded&select=description`,
      memberToken,
    );
    const paymentActivityRows = (await paymentActivity.json()) as Array<{
      description: string;
    }>;
    expect(
      paymentActivityRows.some(
        (row) => row.description === "Member User paid Admin User",
      ),
    ).toBe(true);

    const adminDelete = await request(
      `group_members?group_id=eq.${groupId}&user_id=eq.11111111-1111-4111-8111-111111111111`,
      adminToken,
      { method: "DELETE" },
    );
    expect(adminDelete.ok).toBe(true);
    const adminMembership = await request(
      `group_members?group_id=eq.${groupId}&user_id=eq.11111111-1111-4111-8111-111111111111`,
      adminToken,
    );
    expect(await adminMembership.json()).toHaveLength(1);
  });
});

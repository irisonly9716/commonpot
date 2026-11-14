import { describe, expect, it } from "vitest";

import { PATCH as patchAlert } from "@/app/api/v1/alerts/[alertId]/route";
import { GET as getAlerts } from "@/app/api/v1/alerts/route";
import { GET as getActivity } from "@/app/api/v1/groups/[groupId]/activity/route";
import { GET as getBalances } from "@/app/api/v1/groups/[groupId]/balances/route";
import {
  DELETE as deleteExpense,
  PATCH as patchExpense,
} from "@/app/api/v1/groups/[groupId]/expenses/[expenseId]/route";
import {
  GET as listExpenses,
  POST as postExpense,
} from "@/app/api/v1/groups/[groupId]/expenses/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  member: "22222222-2222-4222-8222-222222222222",
  third: "12121212-1212-4212-8212-121212121212",
};
const users = {
  admin: "admin@example.com",
  member: "member@example.com",
  third: "third-member@example.com",
  nonMember: "site-admin@example.com",
};

type Alert = {
  id: string;
  groupId: string | null;
  kind: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

type ActivityItem = {
  id: string;
  action: string;
  description: string;
  amountCents: number | null;
  actorId: string | null;
  actorName: string;
  createdAt: string;
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
  init: { method?: string; body?: unknown; json?: boolean } = {},
): Request {
  const { method = "GET", body, json = true } = init;
  return new Request(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined && json
        ? { "content-type": "application/json" }
        : {}),
    },
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });
}

const groupContext = { params: Promise.resolve({ groupId }) };

function expenseContext(expenseId: string) {
  return { params: Promise.resolve({ groupId, expenseId }) };
}

function halfAndHalf(description: string, amountCents: number) {
  const half = amountCents / 2;
  return {
    amountCents,
    description,
    categoryId: null,
    expenseDate: "2026-11-09",
    paidBy: ids.member,
    shares: [
      { userId: ids.member, amountCents: half },
      { userId: ids.admin, amountCents: half },
    ],
  };
}

async function createExpense(
  token: string,
  body: ReturnType<typeof halfAndHalf>,
): Promise<string> {
  const response = await postExpense(
    apiRequest(`/groups/${groupId}/expenses`, token, {
      method: "POST",
      body,
    }),
    groupContext,
  );
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

function editExpense(
  token: string | undefined,
  expenseId: string,
  body: unknown,
  json = true,
) {
  return patchExpense(
    apiRequest(`/groups/${groupId}/expenses/${expenseId}`, token, {
      method: "PATCH",
      body,
      json,
    }),
    expenseContext(expenseId),
  );
}

function removeExpense(token: string | undefined, expenseId: string) {
  return deleteExpense(
    apiRequest(`/groups/${groupId}/expenses/${expenseId}`, token, {
      method: "DELETE",
    }),
    expenseContext(expenseId),
  );
}

async function expenseDescriptions(token: string): Promise<string[]> {
  const response = await listExpenses(
    apiRequest(`/groups/${groupId}/expenses`, token),
    groupContext,
  );
  const body = (await response.json()) as Array<{ description: string }>;
  return body.map((expense) => expense.description);
}

async function memberBalance(token: string, userId: string): Promise<number> {
  const response = await getBalances(
    apiRequest(`/groups/${groupId}/balances`, token),
    groupContext,
  );
  const body = (await response.json()) as {
    balances: Array<{ userId: string; balanceCents: number }>;
  };
  return body.balances.find((b) => b.userId === userId)?.balanceCents ?? NaN;
}

async function activity(token: string): Promise<ActivityItem[]> {
  const response = await getActivity(
    apiRequest(`/groups/${groupId}/activity`, token),
    groupContext,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as ActivityItem[];
}

async function alerts(token: string, query = ""): Promise<Alert[]> {
  const response = await getAlerts(apiRequest(`/alerts${query}`, token));
  expect(response.status).toBe(200);
  return (await response.json()) as Alert[];
}

describe("US6 edit and delete expenses API", () => {
  it("lets the person who logged an expense edit it, and balances follow", async () => {
    const token = await signIn(users.member);
    const run = crypto.randomUUID();
    const expenseId = await createExpense(
      token,
      halfAndHalf(`Edit me ${run}`, 1000),
    );
    const before = await memberBalance(token, ids.member);

    const response = await editExpense(
      token,
      expenseId,
      halfAndHalf(`Edited dinner ${run}`, 3000),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: expenseId });
    const descriptions = await expenseDescriptions(token);
    expect(descriptions).toContain(`Edited dinner ${run}`);
    expect(descriptions).not.toContain(`Edit me ${run}`);
    // Paid 3000 and owes 1500 now, instead of paid 1000 and owes 500.
    expect((await memberBalance(token, ids.member)) - before).toBe(1000);
  });

  it("returns 403 when anyone else edits it, even a group admin", async () => {
    const memberToken = await signIn(users.member);
    const expenseId = await createExpense(
      memberToken,
      halfAndHalf("Not yours to edit", 1000),
    );

    const response = await editExpense(
      await signIn(users.admin),
      expenseId,
      halfAndHalf("Tampered", 1000),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
    expect(await expenseDescriptions(memberToken)).toContain(
      "Not yours to edit",
    );
  });

  it("lets a group admin delete someone else's expense and alerts them", async () => {
    const memberToken = await signIn(users.member);
    const description = `Admin removes this ${crypto.randomUUID()}`;
    const expenseId = await createExpense(
      memberToken,
      halfAndHalf(description, 2000),
    );

    const response = await removeExpense(await signIn(users.admin), expenseId);

    expect(response.status).toBe(204);
    expect(await expenseDescriptions(memberToken)).not.toContain(description);
    const alert = (await alerts(memberToken, "?unread=true")).find((item) =>
      item.message.includes(description),
    );
    expect(alert).toMatchObject({
      groupId,
      kind: "expense_deleted",
      readAt: null,
    });
    expect(alert?.message).toContain("Admin User");
  });

  it("lets the person who logged it delete it without alerting themselves", async () => {
    const token = await signIn(users.member);
    const description = `Member removes this ${crypto.randomUUID()}`;
    const expenseId = await createExpense(token, halfAndHalf(description, 400));

    expect((await removeExpense(token, expenseId)).status).toBe(204);
    expect(
      (await alerts(token)).some((item) => item.message.includes(description)),
    ).toBe(false);
  });

  it("returns 403 when a member deletes someone else's expense", async () => {
    const memberToken = await signIn(users.member);
    const expenseId = await createExpense(
      memberToken,
      halfAndHalf("Third member can't delete", 600),
    );

    const response = await removeExpense(await signIn(users.third), expenseId);

    expect(response.status).toBe(403);
    expect(await expenseDescriptions(memberToken)).toContain(
      "Third member can't delete",
    );
  });

  it("validates the request and hides other groups' expenses", async () => {
    const token = await signIn(users.member);
    const expenseId = await createExpense(
      token,
      halfAndHalf("Validate me", 1000),
    );

    const badBody = await editExpense(token, expenseId, {
      ...halfAndHalf("Validate me", 1000),
      amountCents: 999,
    });
    expect(badBody.status).toBe(422);
    expect(
      (await editExpense(token, expenseId, "not json", false)).status,
    ).toBe(415);
    expect((await editExpense(token, "not-a-uuid", {})).status).toBe(422);
    expect((await removeExpense(token, crypto.randomUUID())).status).toBe(404);

    expect((await editExpense(undefined, expenseId, {})).status).toBe(401);
    expect((await removeExpense(undefined, expenseId)).status).toBe(401);
    expect(
      (await removeExpense(await signIn(users.nonMember), expenseId)).status,
    ).toBe(404);
  });
});

describe("US6 activity feed API", () => {
  it("lists adds, edits and deletes newest first with who made them", async () => {
    const token = await signIn(users.member);
    const description = `Feed ${crypto.randomUUID()}`;
    const expenseId = await createExpense(token, halfAndHalf(description, 800));
    await editExpense(token, expenseId, halfAndHalf(description, 1200));
    await removeExpense(await signIn(users.admin), expenseId);

    const items = (await activity(token)).filter(
      (item) => item.description === description,
    );

    expect(items.map((item) => item.action)).toEqual([
      "deleted",
      "edited",
      "added",
    ]);
    expect(items.map((item) => item.actorName)).toEqual([
      "Admin User",
      "Member User",
      "Member User",
    ]);
    expect(items[1].amountCents).toBe(1200);
  });

  it("returns 401 without a token and 404 to a non-member", async () => {
    expect(
      (
        await getActivity(
          apiRequest(`/groups/${groupId}/activity`, undefined),
          groupContext,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await getActivity(
          apiRequest(
            `/groups/${groupId}/activity`,
            await signIn(users.nonMember),
          ),
          groupContext,
        )
      ).status,
    ).toBe(404);
  });
});

describe("US6 alerts API", () => {
  async function deletionAlertForMember(): Promise<{
    token: string;
    alert: Alert;
  }> {
    const token = await signIn(users.member);
    const description = `Alert ${crypto.randomUUID()}`;
    const expenseId = await createExpense(token, halfAndHalf(description, 200));
    await removeExpense(await signIn(users.admin), expenseId);
    const alert = (await alerts(token)).find((item) =>
      item.message.includes(description),
    );
    expect(alert).toBeDefined();
    return { token, alert: alert as Alert };
  }

  function markRead(
    token: string | undefined,
    alertId: string,
    body: unknown = { read: true },
  ) {
    return patchAlert(
      apiRequest(`/alerts/${alertId}`, token, { method: "PATCH", body }),
      { params: Promise.resolve({ alertId }) },
    );
  }

  it("marks my alert as read so it leaves the unread list", async () => {
    const { token, alert } = await deletionAlertForMember();

    const response = await markRead(token, alert.id);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; readAt: string };
    expect(body.id).toBe(alert.id);
    expect(body.readAt).toEqual(expect.any(String));
    expect(
      (await alerts(token, "?unread=true")).some(
        (item) => item.id === alert.id,
      ),
    ).toBe(false);
  });

  it("never shows or changes someone else's alert", async () => {
    const { alert } = await deletionAlertForMember();
    const adminToken = await signIn(users.admin);

    expect(
      (await alerts(adminToken)).some((item) => item.id === alert.id),
    ).toBe(false);
    expect((await markRead(adminToken, alert.id)).status).toBe(404);
  });

  it("validates the request", async () => {
    const { token, alert } = await deletionAlertForMember();

    expect((await markRead(token, alert.id, { read: "yes" })).status).toBe(422);
    expect((await markRead(token, "not-a-uuid")).status).toBe(422);
    expect((await markRead(undefined, alert.id)).status).toBe(401);
    expect((await getAlerts(apiRequest("/alerts", undefined))).status).toBe(
      401,
    );
  });
});

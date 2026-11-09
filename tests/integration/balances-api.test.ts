import { describe, expect, it } from "vitest";

import { GET as getBreakdown } from "@/app/api/v1/groups/[groupId]/balances/[userId]/route";
import { GET as getBalances } from "@/app/api/v1/groups/[groupId]/balances/route";
import { POST as postPayment } from "@/app/api/v1/groups/[groupId]/payments/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  member: "22222222-2222-4222-8222-222222222222",
  third: "12121212-1212-4212-8212-121212121212",
  otherGroupMember: "55555555-5555-4555-8555-555555555555",
};
const users = {
  admin: "admin@example.com",
  member: "member@example.com",
  nonMember: "site-admin@example.com",
};

type BalancesBody = {
  currency: string;
  balances: Array<{
    userId: string;
    displayName: string;
    balanceCents: number;
    status: "owed" | "owes" | "settled";
  }>;
  settlements: Array<{
    fromUserId: string;
    toUserId: string;
    amountCents: number;
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

function authorized(token: string | undefined, init: RequestInit = {}) {
  return {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  };
}

async function fetchBalances(token: string): Promise<BalancesBody> {
  const response = await getBalances(
    new Request(
      `http://localhost/api/v1/groups/${groupId}/balances`,
      authorized(token),
    ),
    { params: Promise.resolve({ groupId }) },
  );
  expect(response.status).toBe(200);
  return (await response.json()) as BalancesBody;
}

function recordPayment(token: string | undefined, body: unknown, json = true) {
  return postPayment(
    new Request(
      `http://localhost/api/v1/groups/${groupId}/payments`,
      authorized(token, {
        method: "POST",
        headers: json ? { "content-type": "application/json" } : {},
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    ),
    { params: Promise.resolve({ groupId }) },
  );
}

function balanceOf(body: BalancesBody, userId: string): number {
  return body.balances.find((b) => b.userId === userId)?.balanceCents ?? NaN;
}

describe("US5 balances API", () => {
  it("returns every member's balance, adding up to zero, with names and wording", async () => {
    const body = await fetchBalances(await signIn(users.member));

    expect(body.currency).toBe("USD");
    expect(body.balances.map((b) => b.userId)).toEqual(
      expect.arrayContaining([ids.admin, ids.member, ids.third]),
    );
    expect(body.balances.reduce((sum, b) => sum + b.balanceCents, 0)).toBe(0);
    for (const balance of body.balances) {
      expect(balance.displayName).not.toBe("");
      const expected =
        balance.balanceCents > 0
          ? "owed"
          : balance.balanceCents < 0
            ? "owes"
            : "settled";
      expect(balance.status).toBe(expected);
    }
  });

  it("suggests at most one fewer payment than the members with a balance", async () => {
    const body = await fetchBalances(await signIn(users.member));
    const nonZero = body.balances.filter((b) => b.balanceCents !== 0).length;

    expect(body.settlements.length).toBeLessThanOrEqual(
      Math.max(nonZero - 1, 0),
    );
    const remaining = Object.fromEntries(
      body.balances.map((b) => [b.userId, b.balanceCents]),
    );
    for (const settlement of body.settlements) {
      remaining[settlement.fromUserId] += settlement.amountCents;
      remaining[settlement.toUserId] -= settlement.amountCents;
    }
    expect(Object.values(remaining).every((cents) => cents === 0)).toBe(true);
  });

  it("records a payment and moves both balances", async () => {
    const token = await signIn(users.member);
    const before = await fetchBalances(token);

    const response = await recordPayment(token, {
      paidBy: ids.member,
      paidTo: ids.admin,
      amountCents: 1500,
      paymentDate: "2026-11-09",
      note: "Settling up",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: expect.any(String) });

    const after = await fetchBalances(token);
    expect(balanceOf(after, ids.member) - balanceOf(before, ids.member)).toBe(
      1500,
    );
    expect(balanceOf(after, ids.admin) - balanceOf(before, ids.admin)).toBe(
      -1500,
    );
  });

  it("returns 403 when someone records a payment they weren't part of", async () => {
    const response = await recordPayment(await signIn(users.admin), {
      paidBy: ids.member,
      paidTo: ids.third,
      amountCents: 500,
      paymentDate: "2026-11-09",
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });

  it("validates the payment request", async () => {
    const token = await signIn(users.member);

    const samePerson = await recordPayment(token, {
      paidBy: ids.member,
      paidTo: ids.member,
      amountCents: 500,
      paymentDate: "2026-11-09",
    });
    expect(samePerson.status).toBe(422);

    const notJson = await recordPayment(token, "not json", false);
    expect(notJson.status).toBe(415);
  });

  it("returns 401 without a token and 404 to a non-member", async () => {
    const unauthenticated = await getBalances(
      new Request(`http://localhost/api/v1/groups/${groupId}/balances`),
      { params: Promise.resolve({ groupId }) },
    );
    expect(unauthenticated.status).toBe(401);

    const noTokenPayment = await recordPayment(undefined, {});
    expect(noTokenPayment.status).toBe(401);

    const nonMember = await getBalances(
      new Request(
        `http://localhost/api/v1/groups/${groupId}/balances`,
        authorized(await signIn(users.nonMember)),
      ),
      { params: Promise.resolve({ groupId }) },
    );
    expect(nonMember.status).toBe(404);
  });
});

describe("US5 balance breakdown API", () => {
  function breakdown(token: string, userId: string) {
    return getBreakdown(
      new Request(
        `http://localhost/api/v1/groups/${groupId}/balances/${userId}`,
        authorized(token),
      ),
      { params: Promise.resolve({ groupId, userId }) },
    );
  }

  it("lists the expenses and payments behind a balance", async () => {
    const token = await signIn(users.member);
    const balances = await fetchBalances(token);
    const response = await breakdown(token, ids.member);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      userId: string;
      balanceCents: number;
      items: Array<{ kind: string; effectCents: number }>;
    };
    expect(body.userId).toBe(ids.member);
    expect(body.balanceCents).toBe(balanceOf(balances, ids.member));
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.reduce((sum, item) => sum + item.effectCents, 0)).toBe(
      body.balanceCents,
    );
  });

  it("returns 404 for someone outside the group and 422 for a bad id", async () => {
    const token = await signIn(users.member);
    expect((await breakdown(token, ids.otherGroupMember)).status).toBe(404);
    expect((await breakdown(token, "not-a-uuid")).status).toBe(422);
  });
});

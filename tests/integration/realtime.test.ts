import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import {
  DELETE as deleteExpense,
  PATCH as patchExpense,
} from "@/app/api/v1/groups/[groupId]/expenses/[expenseId]/route";
import { POST as postExpense } from "@/app/api/v1/groups/[groupId]/expenses/route";
import { POST as postPayment } from "@/app/api/v1/groups/[groupId]/payments/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const ids = {
  admin: "11111111-1111-4111-8111-111111111111",
  member: "22222222-2222-4222-8222-222222222222",
  outsider: "33333333-3333-4333-8333-333333333333",
};
const users = {
  admin: "admin@example.com",
  member: "member@example.com",
  // The site admin is in no group, so it plays the outsider.
  outsider: "site-admin@example.com",
};

type Change = { table: string; row: Record<string, unknown> };
type Listener = { channel: RealtimeChannel; changes: Change[] };

const clients: SupabaseClient[] = [];

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

/** Subscribes the way the browser does: the group's activity and my alerts. */
async function listen(email: string, userId: string): Promise<Listener> {
  const token = await signIn(email);
  const client = createClient(supabaseUrl, anonKey, {
    accessToken: async () => token,
  });
  clients.push(client);
  await client.realtime.setAuth();

  const changes: Change[] = [];
  const channel = client
    .channel(`test-${email}-${crypto.randomUUID()}`, {
      config: { postgres_changes_options: { wait: true } },
    })
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activity",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => changes.push({ table: "activity", row: payload.new }),
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "alerts",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => changes.push({ table: "alerts", row: payload.new }),
    );

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${email} could not subscribe`)),
      10_000,
    );
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        reject(err ?? new Error(status));
      }
    });
  });
  return { channel, changes };
}

function apiRequest(
  path: string,
  token: string,
  method: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function expenseBody(description: string, paidBy: string) {
  return {
    amountCents: 1200,
    description,
    categoryId: null,
    expenseDate: "2026-11-13",
    paidBy,
    shares: [
      { userId: ids.admin, amountCents: 600 },
      { userId: ids.member, amountCents: 600 },
    ],
  };
}

async function createExpense(
  token: string,
  description: string,
  paidBy: string,
): Promise<string> {
  const response = await postExpense(
    apiRequest(
      `/api/v1/groups/${groupId}/expenses`,
      token,
      "POST",
      expenseBody(description, paidBy),
    ),
    { params: Promise.resolve({ groupId }) },
  );
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

function hasActivity(listener: Listener, action: string, description: string) {
  return listener.changes.some(
    (change) =>
      change.table === "activity" &&
      change.row.action === action &&
      change.row.description === description,
  );
}

const twoSeconds = { timeout: 2000, interval: 50 };

afterAll(async () => {
  await Promise.all(clients.map((client) => client.removeAllChannels()));
});

// Joining waits for the server to confirm the subscription, which can take a few
// seconds on a cold local stack; the 2-second checks below start after that.
describe(
  "US4 see changes as they happen: Realtime",
  { timeout: 30_000 },
  () => {
    it("tells another member about a new expense within 2 seconds", async () => {
      const member = await listen(users.member, ids.member);
      const adminToken = await signIn(users.admin);
      const description = `Live groceries ${crypto.randomUUID()}`;

      await createExpense(adminToken, description, ids.admin);

      await expect
        .poll(() => hasActivity(member, "added", description), twoSeconds)
        .toBe(true);
    });

    it("also sends edits, deletions and payments", async () => {
      const member = await listen(users.member, ids.member);
      const adminToken = await signIn(users.admin);
      const description = `Live taxi ${crypto.randomUUID()}`;
      const expenseId = await createExpense(adminToken, description, ids.admin);
      const context = { params: Promise.resolve({ groupId, expenseId }) };

      const edited = `${description} (edited)`;
      const patch = await patchExpense(
        apiRequest(
          `/api/v1/groups/${groupId}/expenses/${expenseId}`,
          adminToken,
          "PATCH",
          expenseBody(edited, ids.admin),
        ),
        context,
      );
      expect(patch.status).toBe(200);
      await expect
        .poll(() => hasActivity(member, "edited", edited), twoSeconds)
        .toBe(true);

      const removal = await deleteExpense(
        apiRequest(
          `/api/v1/groups/${groupId}/expenses/${expenseId}`,
          adminToken,
          "DELETE",
        ),
        context,
      );
      expect(removal.status).toBe(204);
      await expect
        .poll(() => hasActivity(member, "deleted", edited), twoSeconds)
        .toBe(true);

      const payment = await postPayment(
        apiRequest(`/api/v1/groups/${groupId}/payments`, adminToken, "POST", {
          paidBy: ids.admin,
          paidTo: ids.member,
          amountCents: 500,
          paymentDate: "2026-11-13",
        }),
        { params: Promise.resolve({ groupId }) },
      );
      expect(payment.status).toBe(201);
      await expect
        .poll(
          () =>
            member.changes.some(
              (change) =>
                change.table === "activity" &&
                change.row.action === "payment_recorded",
            ),
          twoSeconds,
        )
        .toBe(true);
    });

    it("does not send a group's changes to someone outside it", async () => {
      const member = await listen(users.member, ids.member);
      const outsider = await listen(users.outsider, ids.outsider);
      const adminToken = await signIn(users.admin);
      const description = `Private rent ${crypto.randomUUID()}`;

      await createExpense(adminToken, description, ids.admin);

      await expect
        .poll(() => hasActivity(member, "added", description), twoSeconds)
        .toBe(true);
      // Give a wrongly delivered event the same time to arrive before checking.
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(outsider.changes).toEqual([]);
    });

    it("alerts the person who logged an expense when an admin deletes it", async () => {
      const member = await listen(users.member, ids.member);
      const memberToken = await signIn(users.member);
      const adminToken = await signIn(users.admin);
      const description = `Member snacks ${crypto.randomUUID()}`;
      const expenseId = await createExpense(
        memberToken,
        description,
        ids.member,
      );

      const removal = await deleteExpense(
        apiRequest(
          `/api/v1/groups/${groupId}/expenses/${expenseId}`,
          adminToken,
          "DELETE",
        ),
        { params: Promise.resolve({ groupId, expenseId }) },
      );
      expect(removal.status).toBe(204);

      await expect
        .poll(
          () =>
            member.changes.some(
              (change) =>
                change.table === "alerts" &&
                change.row.kind === "expense_deleted" &&
                change.row.user_id === ids.member,
            ),
          twoSeconds,
        )
        .toBe(true);
    });
  },
);

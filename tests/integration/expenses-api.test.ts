import { describe, expect, it } from "vitest";

import {
  GET,
  POST,
} from "../../src/app/api/v1/groups/[groupId]/expenses/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const groupId = "11111111-1111-4111-8111-111111111111";
const userPassword = "password123";
const users = {
  admin: "admin@example.com",
  nonMember: "site-admin@example.com",
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
  const body = (await response.json()) as { access_token: string };
  expect(response.ok).toBe(true);
  return body.access_token;
}

function request(
  method: "GET" | "POST",
  token: string | undefined,
  body?: unknown,
): Request {
  return new Request(`http://localhost/api/v1/groups/${groupId}/expenses`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const context = { params: Promise.resolve({ groupId }) };

describe("US3 expense API", () => {
  it("creates an expense and returns it first from GET", async () => {
    const token = await signIn(users.admin);
    const response = await POST(
      request("POST", token, {
        amountCents: 8421,
        description: "API newest expense",
        categoryId: null,
        expenseDate: "2026-11-07",
        paidBy: "11111111-1111-4111-8111-111111111111",
        shares: [
          {
            userId: "11111111-1111-4111-8111-111111111111",
            amountCents: 4211,
          },
          {
            userId: "22222222-2222-4222-8222-222222222222",
            amountCents: 4210,
          },
        ],
      }),
      context,
    );

    expect(response.status).toBe(201);
    const listResponse = await GET(request("GET", token), context);
    const list = (await listResponse.json()) as Array<{
      description: string;
    }>;
    expect(listResponse.status).toBe(200);
    expect(list[0]?.description).toBe("API newest expense");
  });

  it("returns a validation error for an invalid body", async () => {
    const token = await signIn(users.admin);
    const response = await POST(
      request("POST", token, {
        amountCents: 0,
        description: "",
      }),
      context,
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("returns 415 when POST is not JSON", async () => {
    const token = await signIn(users.admin);
    const response = await POST(
      new Request(`http://localhost/api/v1/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: "not json",
      }),
      context,
    );

    expect(response.status).toBe(415);
  });

  it("returns 422 for an invalid group id", async () => {
    const token = await signIn(users.admin);
    const response = await POST(
      new Request("http://localhost/api/v1/groups/not-a-uuid/expenses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: "{}",
      }),
      { params: Promise.resolve({ groupId: "not-a-uuid" }) },
    );

    expect(response.status).toBe(422);
  });

  it("returns 401 without a token", async () => {
    const response = await GET(request("GET", undefined), context);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("does not expose expenses to a non-member", async () => {
    const token = await signIn(users.nonMember);
    const response = await GET(request("GET", token), context);

    expect([403, 404]).toContain(response.status);
  });

  it("returns 401 before checking the group id", async () => {
    const badContext = { params: Promise.resolve({ groupId: "not-a-uuid" }) };
    const url = "http://localhost/api/v1/groups/not-a-uuid/expenses";

    const get = await GET(new Request(url), badContext);
    expect(get.status).toBe(401);

    const post = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      badContext,
    );
    expect(post.status).toBe(401);
  });
});

import { describe, expect, it } from "vitest";

import { POST as issueToken } from "@/app/api/v1/auth/token/route";
import { GET as listExpenses } from "@/app/api/v1/groups/[groupId]/expenses/route";

const seedGroupId = "11111111-1111-4111-8111-111111111111";

function tokenRequest(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/v1/auth/token", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function token(email: string, password = "password123") {
  const response = await issueToken(tokenRequest({ email, password }));
  expect(response.status).toBe(200);
  return (await response.json()) as { accessToken: string };
}

function expensesRequest(accessToken?: string) {
  return new Request(`http://localhost/api/v1/groups/${seedGroupId}/expenses`, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
}
const groupContext = { params: Promise.resolve({ groupId: seedGroupId }) };

describe("US13 connect other tools: signing in through the API", () => {
  it("returns a bearer token, a refresh token and the user", async () => {
    const response = await issueToken(
      tokenRequest({ email: "member@example.com", password: "password123" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tokenType: "bearer",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: expect.any(Number),
      user: { id: expect.any(String), email: "member@example.com" },
    });
  });

  it("never echoes the password", async () => {
    const response = await issueToken(
      tokenRequest({ email: "member@example.com", password: "password123" }),
    );
    expect(await response.text()).not.toContain("password123");
  });

  it("gives a token that works as Authorization: Bearer on other endpoints", async () => {
    const { accessToken } = await token("member@example.com");
    const response = await listExpenses(
      expensesRequest(accessToken),
      groupContext,
    );
    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  it("lets a user reach only their own groups' data", async () => {
    const { accessToken } = await token("site-admin@example.com");
    const response = await listExpenses(
      expensesRequest(accessToken),
      groupContext,
    );
    expect(response.status).toBe(404);
  });

  it("shows the same 401 for a wrong password and an unknown email", async () => {
    const wrongPassword = await issueToken(
      tokenRequest({
        email: "member@example.com",
        password: "not-the-password",
      }),
    );
    const unknownEmail = await issueToken(
      tokenRequest({
        email: "nobody-here@example.com",
        password: "not-the-password",
      }),
    );
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
    expect(await unknownEmail.json()).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
  });

  it("returns 422 for a missing or invalid email or password", async () => {
    for (const body of [
      {},
      { email: "member@example.com" },
      { password: "password123" },
      { email: "not-an-email", password: "password123" },
      { email: "member@example.com", password: "" },
    ]) {
      const response = await issueToken(tokenRequest(body));
      expect(response.status, JSON.stringify(body)).toBe(422);
    }
  });

  it("returns 422 for invalid JSON and 415 for another content type", async () => {
    expect((await issueToken(tokenRequest("{not json"))).status).toBe(422);
    expect(
      (
        await issueToken(
          tokenRequest("email=a", "application/x-www-form-urlencoded"),
        )
      ).status,
    ).toBe(415);
  });
});

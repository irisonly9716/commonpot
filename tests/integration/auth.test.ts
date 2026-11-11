import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/me/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  const text = await response.text();
  expect(response.ok, text).toBe(true);
  return (JSON.parse(text) as { access_token: string }).access_token;
}

async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<string> {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: { display_name: displayName },
    }),
  });
  const text = await response.text();
  expect(response.ok, text).toBe(true);
  return (JSON.parse(text) as { access_token: string }).access_token;
}

function meRequest(authorization?: string): Request {
  return new Request("http://localhost/api/v1/me", {
    headers: authorization ? { authorization } : {},
  });
}

describe("US1 sign in safely: API requests need a valid token", () => {
  it("returns 401 with the standard error shape when there is no token", async () => {
    const response = await GET(meRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.any(String) },
    });
  });

  it("returns 401 for a token that is not valid", async () => {
    const response = await GET(meRequest("Bearer not-a-real-token"));
    expect(response.status).toBe(401);
  });

  it("returns 401 for an Authorization header that is not a Bearer token", async () => {
    const response = await GET(meRequest("Basic dXNlcjpwYXNz"));
    expect(response.status).toBe(401);
  });

  it("returns the signed-in user for a valid token", async () => {
    const token = await signIn("member@example.com", "password123");
    const response = await GET(meRequest(`Bearer ${token}`));
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      id: "22222222-2222-4222-8222-222222222222",
      email: "member@example.com",
    });
    expect(typeof body.displayName).toBe("string");
  });

  it("does not return password or token fields", async () => {
    const token = await signIn("member@example.com", "password123");
    const response = await GET(meRequest(`Bearer ${token}`));
    const text = await response.text();
    expect(text).not.toMatch(/password|access_token|refresh_token/i);
  });
});

describe("US1 sign in safely: sign up", () => {
  it("creates a profile with the chosen display name", async () => {
    const email = `signup-${Date.now()}@example.com`;
    const token = await signUp(email, "a-long-password", "Casey Test");
    const response = await GET(meRequest(`Bearer ${token}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      email,
      displayName: "Casey Test",
    });
  });

  it("lets a new user sign in after signing up", async () => {
    const email = `again-${Date.now()}@example.com`;
    await signUp(email, "a-long-password", "Casey Again");
    const token = await signIn(email, "a-long-password");
    expect(token.length).toBeGreaterThan(20);
  });
});

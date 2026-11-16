import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/db/database.types";
import { GET as getMe } from "@/app/api/v1/me/route";
import {
  GET as listCategories,
  POST as createCategory,
} from "@/app/api/v1/admin/default-categories/route";
import {
  DELETE as deleteCategory,
  PATCH as updateCategory,
} from "@/app/api/v1/admin/default-categories/[categoryId]/route";
import { GET as listGroups } from "@/app/api/v1/admin/groups/route";
import { PATCH as patchUser } from "@/app/api/v1/admin/users/[userId]/route";
import { GET as listUsers } from "@/app/api/v1/admin/users/route";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const password = "password123";

type Json = Record<string, unknown>;

async function signInRaw(email: string, pass = password): Promise<Response> {
  return fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
}

async function signIn(email: string): Promise<string> {
  const response = await signInRaw(email);
  const text = await response.text();
  expect(response.ok, text).toBe(true);
  return (JSON.parse(text) as { access_token: string }).access_token;
}

async function signUpFreshUser(): Promise<{
  id: string;
  email: string;
  token: string;
}> {
  const email = `suspend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      data: { display_name: "Suspend Me" },
    }),
  });
  const body = (await response.json()) as {
    access_token: string;
    user: { id: string };
  };
  expect(response.ok).toBe(true);
  return { id: body.user.id, email, token: body.access_token };
}

function call(
  method: string,
  token: string | undefined,
  body?: unknown,
): Request {
  return new Request("http://localhost/api/v1/admin", {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const userContext = (userId: string) => ({
  params: Promise.resolve({ userId }),
});
const categoryContext = (categoryId: string) => ({
  params: Promise.resolve({ categoryId }),
});

describe("US12 site admin API: who can use it", () => {
  it("answers 401 without a token and 403 for a plain member", async () => {
    const member = await signIn("member@example.com");
    const handlers = [
      () => listUsers(call("GET", undefined)),
      () => listGroups(call("GET", undefined)),
      () => listCategories(call("GET", undefined)),
    ];
    for (const run of handlers) {
      const response = await run();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: { code: "UNAUTHORIZED", message: expect.any(String) },
      });
    }

    const forbidden = [
      await listUsers(call("GET", member)),
      await listGroups(call("GET", member)),
      await listCategories(call("GET", member)),
      await createCategory(call("POST", member, { name: "Nope" })),
      await patchUser(
        call("PATCH", member, { suspended: true }),
        userContext("22222222-2222-4222-8222-222222222222"),
      ),
      await updateCategory(
        call("PATCH", member, { name: "Nope" }),
        categoryContext("22222222-2222-4222-8222-222222222222"),
      ),
      await deleteCategory(
        call("DELETE", member),
        categoryContext("22222222-2222-4222-8222-222222222222"),
      ),
    ];
    for (const response of forbidden) {
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: { code: "FORBIDDEN", message: expect.any(String) },
      });
    }
  });

  it("treats a group admin like any other member: 403", async () => {
    const groupAdmin = await signIn("admin@example.com");
    expect((await listUsers(call("GET", groupAdmin))).status).toBe(403);
  });
});

describe("US12 site admin API: lists show counts, never amounts", () => {
  it("lists users with dates and counts", async () => {
    const token = await signIn("site-admin@example.com");
    const response = await listUsers(call("GET", token));
    expect(response.status).toBe(200);
    const users = (await response.json()) as Json[];
    const admin = users.find((u) => u.email === "admin@example.com");
    expect(admin).toBeDefined();
    expect(admin).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      email: "admin@example.com",
      displayName: expect.any(String),
      createdAt: expect.any(String),
      suspendedAt: null,
      isSiteAdmin: false,
      groupCount: expect.any(Number),
      expenseCount: expect.any(Number),
    });
    expect(admin!.groupCount).toBeGreaterThanOrEqual(1);
    expect(admin!.expenseCount).toBeGreaterThanOrEqual(1);
  });

  it("lists groups with dates and counts", async () => {
    const token = await signIn("site-admin@example.com");
    const response = await listGroups(call("GET", token));
    expect(response.status).toBe(200);
    const groups = (await response.json()) as Json[];
    const seed = groups.find(
      (g) => g.id === "11111111-1111-4111-8111-111111111111",
    );
    expect(seed).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: expect.any(String),
      createdAt: expect.any(String),
      memberCount: expect.any(Number),
      expenseCount: expect.any(Number),
    });
    expect(seed!.memberCount).toBeGreaterThanOrEqual(2);
  });

  it("never includes amounts or expense details anywhere", async () => {
    const token = await signIn("site-admin@example.com");
    // Check the field names, not the text. Other tests create groups and
    // users whose names can contain words like "Groceries".
    const keys = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.flatMap(keys)
        : value && typeof value === "object"
          ? Object.entries(value).flatMap(([key, inner]) => [
              key,
              ...keys(inner),
            ])
          : [];
    const users = await listUsers(call("GET", token));
    const groups = await listGroups(call("GET", token));
    expect(users.status).toBe(200);
    expect(groups.status).toBe(200);
    const found = [...keys(await users.json()), ...keys(await groups.json())];
    expect(
      found.filter((key) => /amount|cents|description|total/i.test(key)),
    ).toEqual([]);
  });
});

describe("US12 site admin API: suspend and reactivate", () => {
  it("blocks sign-in and the API for a suspended user, and restores both", async () => {
    const admin = await signIn("site-admin@example.com");
    const user = await signUpFreshUser();
    expect((await getMe(call("GET", user.token))).status).toBe(200);

    const suspend = await patchUser(
      call("PATCH", admin, { suspended: true }),
      userContext(user.id),
    );
    expect(suspend.status).toBe(200);
    expect(await suspend.json()).toEqual({
      id: user.id,
      suspendedAt: expect.any(String),
    });

    // The token they already hold stops working, and they cannot sign in again.
    expect((await getMe(call("GET", user.token))).status).toBe(401);
    expect((await signInRaw(user.email)).ok).toBe(false);
    const listed = (await (
      await listUsers(call("GET", admin))
    ).json()) as Json[];
    expect(listed.find((u) => u.id === user.id)?.suspendedAt).toEqual(
      expect.any(String),
    );

    const reactivate = await patchUser(
      call("PATCH", admin, { suspended: false }),
      userContext(user.id),
    );
    expect(reactivate.status).toBe(200);
    expect(await reactivate.json()).toEqual({
      id: user.id,
      suspendedAt: null,
    });
    const newToken = await signIn(user.email);
    expect((await getMe(call("GET", newToken))).status).toBe(200);
  });

  it("treats suspended_at as signed out even without the Auth ban", async () => {
    // The ban and suspended_at are set together, but the API must not depend on
    // the ban alone: an access token stays valid until it expires.
    const user = await signUpFreshUser();
    expect((await getMe(call("GET", user.token))).status).toBe(200);

    const service = createClient<Database>(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    await service
      .from("profiles")
      .update({ suspended_at: new Date().toISOString() })
      .eq("id", user.id);
    expect((await getMe(call("GET", user.token))).status).toBe(401);

    await service
      .from("profiles")
      .update({ suspended_at: null })
      .eq("id", user.id);
    expect((await getMe(call("GET", user.token))).status).toBe(200);
  });

  it("does not let a site admin suspend themselves", async () => {
    const admin = await signIn("site-admin@example.com");
    const users = (await (
      await listUsers(call("GET", admin))
    ).json()) as Json[];
    const self = users.find((u) => u.email === "site-admin@example.com")!;
    const response = await patchUser(
      call("PATCH", admin, { suspended: true }),
      userContext(self.id as string),
    );
    expect(response.status).toBe(409);
    expect((await getMe(call("GET", admin))).status).toBe(200);
  });

  it("validates the body and the user", async () => {
    const admin = await signIn("site-admin@example.com");
    const missing = await patchUser(
      call("PATCH", admin, { suspended: "yes" }),
      userContext("22222222-2222-4222-8222-222222222222"),
    );
    expect(missing.status).toBe(422);
    const badId = await patchUser(
      call("PATCH", admin, { suspended: true }),
      userContext("not-a-uuid"),
    );
    expect(badId.status).toBe(422);
    const unknown = await patchUser(
      call("PATCH", admin, { suspended: true }),
      userContext("00000000-0000-4000-8000-000000000000"),
    );
    expect(unknown.status).toBe(404);
  });
});

describe("US12 site admin API: default categories", () => {
  it("adds, renames, archives and deletes a default category", async () => {
    const admin = await signIn("site-admin@example.com");
    const name = `Pets ${Date.now()}`;

    const created = await createCategory(call("POST", admin, { name }));
    expect(created.status).toBe(201);
    const category = (await created.json()) as {
      id: string;
      name: string;
      isArchived: boolean;
    };
    expect(category).toEqual({
      id: expect.any(String),
      name,
      isArchived: false,
    });

    const duplicate = await createCategory(call("POST", admin, { name }));
    expect(duplicate.status).toBe(409);

    const renamed = await updateCategory(
      call("PATCH", admin, { name: `${name} 2`, isArchived: true }),
      categoryContext(category.id),
    );
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toEqual({
      id: category.id,
      name: `${name} 2`,
      isArchived: true,
    });

    const list = (await (
      await listCategories(call("GET", admin))
    ).json()) as Array<{ id: string; name: string }>;
    expect(list.some((c) => c.id === category.id)).toBe(true);

    expect(
      (
        await deleteCategory(
          call("DELETE", admin),
          categoryContext(category.id),
        )
      ).status,
    ).toBe(204);
    const after = (await (
      await listCategories(call("GET", admin))
    ).json()) as Array<{ id: string }>;
    expect(after.some((c) => c.id === category.id)).toBe(false);
    expect(
      (
        await deleteCategory(
          call("DELETE", admin),
          categoryContext(category.id),
        )
      ).status,
    ).toBe(404);
  });

  it("rejects an empty name", async () => {
    const admin = await signIn("site-admin@example.com");
    expect(
      (await createCategory(call("POST", admin, { name: "   " }))).status,
    ).toBe(422);
  });

  it("new groups start with the edited list", async () => {
    // Existing groups keep their own copy; only new groups read the default list.
    const admin = await signIn("site-admin@example.com");
    const name = `Hobbies ${Date.now()}`;
    expect((await createCategory(call("POST", admin, { name }))).status).toBe(
      201,
    );

    const member = await signIn("member@example.com");
    const supabase = createClient<Database>(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${member}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const groupId = crypto.randomUUID();
    const { error } = await supabase.from("groups").insert({
      id: groupId,
      name: "Default list check",
      created_by: "22222222-2222-4222-8222-222222222222",
    });
    expect(error).toBeNull();
    const { data } = await supabase
      .from("categories")
      .select("name")
      .eq("group_id", groupId);
    expect((data ?? []).map((c) => c.name)).toContain(name);
  });
});

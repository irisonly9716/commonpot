import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

import type { Database } from "@/lib/db/database.types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = "password123";
const seedGroup = "11111111-1111-4111-8111-111111111111";

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient<Database>(supabaseUrl, serviceKey, options);

type Db = SupabaseClient<Database>;

function asToken(token: string): Db {
  return createClient<Database>(supabaseUrl, anonKey, {
    ...options,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function signIn(email: string): Promise<{ token: string; id: string }> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  const body = (await response.json()) as {
    access_token: string;
    user: { id: string };
  };
  expect(response.ok).toBe(true);
  return { token: body.access_token, id: body.user.id };
}

async function freshUser(): Promise<{ token: string; id: string }> {
  const email = `rls-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json()) as {
    access_token: string;
    user: { id: string };
  };
  expect(response.ok).toBe(true);
  return { token: body.access_token, id: body.user.id };
}

// Sets suspended_at only. The Auth ban is not applied, so the access token
// stays valid, which is exactly the window the database has to close.
async function setSuspended(id: string, suspended: boolean) {
  const { error } = await service
    .from("profiles")
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq("id", id);
  expect(error).toBeNull();
}

const toRestore: string[] = [];
afterEach(async () => {
  for (const id of toRestore.splice(0)) await setSuspended(id, false);
});

describe("suspended users and the database (#17)", () => {
  it("cannot read or write through PostgREST with a token that is still valid", async () => {
    const user = await freshUser();
    const db = asToken(user.token);
    const groupId = crypto.randomUUID();
    expect(
      (
        await db
          .from("groups")
          .insert({ id: groupId, name: "Mine", created_by: user.id })
      ).error,
    ).toBeNull();
    expect((await db.from("groups").select("id")).data).toHaveLength(1);

    toRestore.push(user.id);
    await setSuspended(user.id, true);

    expect((await db.from("groups").select("id")).data).toEqual([]);
    expect((await db.from("profiles").select("id")).data).toEqual([]);
    expect((await db.from("categories").select("id")).data).toEqual([]);
    expect(
      (
        await db.from("groups").insert({
          id: crypto.randomUUID(),
          name: "Sneaky",
          created_by: user.id,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await db.from("personal_expenses").insert({
          user_id: user.id,
          amount_cents: 100,
          description: "Sneaky",
          category: "Other",
          expense_date: "2026-11-01",
        })
      ).error,
    ).not.toBeNull();

    // Reactivating brings everything back.
    await setSuspended(user.id, false);
    expect((await db.from("groups").select("id")).data).toHaveLength(1);
  });

  it("cannot join a group with an invite while suspended", async () => {
    const user = await freshUser();
    toRestore.push(user.id);
    await setSuspended(user.id, true);
    const { error } = await asToken(user.token).rpc("accept_invite", {
      p_token: "seed-invite-token",
    });
    expect(error).not.toBeNull();
    const { data } = await service
      .from("group_members")
      .select("user_id")
      .eq("group_id", seedGroup)
      .eq("user_id", user.id);
    expect(data).toEqual([]);
  });

  it("a suspended site admin loses admin access at once", async () => {
    const admin = await signIn("site-admin@example.com");
    const db = asToken(admin.token);
    expect((await db.rpc("admin_list_users")).error).toBeNull();

    toRestore.push(admin.id);
    await setSuspended(admin.id, true);

    const list = await db.rpc("admin_list_users");
    expect(list.error).not.toBeNull();
    expect(list.data).toBeNull();
    expect((await db.rpc("admin_list_groups")).error).not.toBeNull();
    expect((await db.rpc("platform_counts")).error).not.toBeNull();
    const insert = await db
      .from("default_categories")
      .insert({ name: `Sneaky ${Date.now()}` });
    expect(insert.error).not.toBeNull();
  });
});

describe("admin lists called directly (#17)", () => {
  it("raises for a plain member", async () => {
    const member = await signIn("member@example.com");
    const db = asToken(member.token);
    for (const fn of ["admin_list_users", "admin_list_groups"] as const) {
      const { data, error } = await db.rpc(fn);
      expect(data).toBeNull();
      expect(error?.code).toBe("42501");
    }
  });

  it("is not callable with only the anon key", async () => {
    const db = createClient<Database>(supabaseUrl, anonKey, options);
    for (const fn of ["admin_list_users", "admin_list_groups"] as const) {
      const { data, error } = await db.rpc(fn);
      expect(data).toBeNull();
      expect(error).not.toBeNull();
    }
  });
});

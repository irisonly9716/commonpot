import { beforeEach, describe, expect, it, vi } from "vitest";

type ProfileResult = {
  data: { suspended_at: string | null } | null;
  error: { message: string } | null;
};

let profileResult: ProfileResult;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => profileResult }),
      }),
    }),
  }),
}));

vi.mock("@/lib/db/server", () => ({
  createServerSupabaseClient: vi.fn(),
  supabaseUrl: "http://localhost",
  supabaseAnonKey: "anon",
}));

import { getAuthenticatedSupabase } from "@/lib/api/auth";

function request() {
  return new Request("http://localhost/api/v1/me", {
    headers: { Authorization: "Bearer some-token" },
  });
}

describe("getAuthenticatedSupabase and suspension (#17)", () => {
  beforeEach(() => {
    profileResult = { data: { suspended_at: null }, error: null };
  });

  it("lets an active user through", async () => {
    const result = await getAuthenticatedSupabase(request());
    expect(result?.user.id).toBe("user-1");
  });

  it("treats a suspended user as signed out", async () => {
    profileResult = {
      data: { suspended_at: "2026-11-14T10:00:00Z" },
      error: null,
    };
    expect(await getAuthenticatedSupabase(request())).toBeNull();
  });

  it("fails closed when the profile query errors", async () => {
    profileResult = { data: null, error: { message: "boom" } };
    expect(await getAuthenticatedSupabase(request())).toBeNull();
  });

  it("fails closed when there is no profile row", async () => {
    profileResult = { data: null, error: null };
    expect(await getAuthenticatedSupabase(request())).toBeNull();
  });
});

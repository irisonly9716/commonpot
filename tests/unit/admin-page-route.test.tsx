import { beforeEach, describe, expect, it, vi } from "vitest";

const forbidden = vi.fn(() => {
  throw new Error("NEXT_FORBIDDEN");
});
vi.mock("next/navigation", () => ({
  forbidden: () => forbidden(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

let profile: { is_site_admin: boolean } | null = { is_site_admin: false };
let user: { id: string } | null = { id: "u1" };
vi.mock("@/lib/db/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profile }) }),
      }),
    }),
  })),
}));

const loadAdminDashboard = vi.fn();
vi.mock("@/lib/data/admin", () => ({
  loadAdminDashboard: (...args: unknown[]) => loadAdminDashboard(...args),
}));

import AdminPage from "@/app/admin/page";

describe("US12 admin page access", () => {
  beforeEach(() => {
    forbidden.mockClear();
    loadAdminDashboard.mockReset();
    loadAdminDashboard.mockResolvedValue({
      users: [],
      groups: [],
      categories: [],
    });
    user = { id: "u1" };
    profile = { is_site_admin: false };
  });

  it("answers 403 for a signed-in user who is not a site admin", async () => {
    await expect(AdminPage()).rejects.toThrow("NEXT_FORBIDDEN");
    expect(loadAdminDashboard).not.toHaveBeenCalled();
  });

  it("answers 403 when the profile cannot be found", async () => {
    profile = null;
    await expect(AdminPage()).rejects.toThrow("NEXT_FORBIDDEN");
  });

  it("loads the dashboard for a site admin", async () => {
    profile = { is_site_admin: true };
    await AdminPage();
    expect(forbidden).not.toHaveBeenCalled();
    expect(loadAdminDashboard).toHaveBeenCalledTimes(1);
  });
});

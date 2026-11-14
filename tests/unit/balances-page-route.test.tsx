import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/db/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "22222222-2222-4222-8222-222222222222" } },
      }),
    },
  })),
}));

vi.mock("@/lib/data/balances", () => ({
  loadGroupLedger: vi.fn(async () => null),
  buildGroupBalances: vi.fn(),
  buildBalanceBreakdown: vi.fn(),
}));

import GroupBalancesPage from "@/app/groups/[groupId]/balances/page";

describe("US5 balances page", () => {
  it("returns a 404 when the signed-in user isn't in the group", async () => {
    await expect(
      GroupBalancesPage({
        params: Promise.resolve({
          groupId: "99999999-9999-4999-8999-999999999999",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns a 404 for a group id that isn't a UUID", async () => {
    await expect(
      GroupBalancesPage({ params: Promise.resolve({ groupId: "nope" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/groups/g/insights",
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

const loadGroupSpending = vi.fn();
vi.mock("@/lib/data/spending", () => ({
  loadGroupSpending: (...args: unknown[]) => loadGroupSpending(...args),
}));

import GroupInsightsPage from "@/app/groups/[groupId]/insights/page";

const groupId = "11111111-1111-4111-8111-111111111111";

function renderPage(searchParams: { month?: string | string[] } = {}) {
  return GroupInsightsPage({
    params: Promise.resolve({ groupId }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("US8 insights page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    loadGroupSpending.mockReset();
    loadGroupSpending.mockResolvedValue({
      groupName: "Flat",
      currency: "USD",
      expenses: [],
    });
  });
  afterEach(() => vi.useRealTimers());

  it("returns a 404 when the signed-in user isn't in the group", async () => {
    loadGroupSpending.mockResolvedValue(null);
    await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns a 404 for a group id that isn't a UUID", async () => {
    await expect(
      GroupInsightsPage({
        params: Promise.resolve({ groupId: "nope" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows this month when no month is given", async () => {
    await renderPage();
    expect(loadGroupSpending).toHaveBeenCalledWith(
      expect.anything(),
      groupId,
      "2026-11",
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("uses the month in the query string", async () => {
    await renderPage({ month: "2026-09" });
    expect(loadGroupSpending.mock.calls[0][2]).toBe("2026-09");
  });

  it.each(["2026-13", "banana", "2026-9", "2026-09-01", ["2026-09", "x"]])(
    "falls back to this month for the bad value %j",
    async (month) => {
      await renderPage({ month });
      expect(loadGroupSpending.mock.calls[0][2]).toBe("2026-11");
    },
  );

  it("does not offer a future month", async () => {
    await renderPage({ month: "2027-02" });
    expect(loadGroupSpending.mock.calls[0][2]).toBe("2026-11");
  });
});

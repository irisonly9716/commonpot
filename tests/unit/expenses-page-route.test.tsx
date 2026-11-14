import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/data/expenses", () => ({
  getExpensePageData: vi.fn(async () => ({
    user: { id: "22222222-2222-4222-8222-222222222222" },
    group: null,
    currency: "USD",
    members: [],
    categories: [],
    expenses: [],
  })),
}));

import GroupExpensesPage from "@/app/groups/[groupId]/expenses/page";

describe("US3 expenses page", () => {
  it("returns a 404 when the signed-in user isn't in the group", async () => {
    await expect(
      GroupExpensesPage({
        params: Promise.resolve({
          groupId: "99999999-9999-4999-8999-999999999999",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

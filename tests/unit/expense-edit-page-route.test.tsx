import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const alex = "22222222-2222-4222-8222-222222222222";
const groupId = "11111111-1111-4111-8111-111111111111";
const expenseId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const getExpenseEditData = vi.fn();
vi.mock("@/lib/data/expenses", () => ({
  getExpenseEditData: (...args: unknown[]) => getExpenseEditData(...args),
}));

import EditExpensePage from "@/app/groups/[groupId]/expenses/[expenseId]/edit/page";

function page(params: { groupId: string; expenseId: string }) {
  return EditExpensePage({ params: Promise.resolve(params) });
}

const editData = {
  user: { id: alex },
  currency: "USD",
  members: [{ id: alex, displayName: "Alex" }],
  categories: [],
  expense: {
    id: expenseId,
    amountCents: 1000,
    description: "Utilities",
    categoryId: null,
    expenseDate: "2026-11-05",
    paidBy: alex,
    createdBy: alex,
    shares: [{ userId: alex, amountCents: 1000 }],
  },
};

afterEach(cleanup);

describe("US6 edit expense page", () => {
  it("returns a 404 for an expense id that isn't a UUID", async () => {
    await expect(page({ groupId, expenseId: "nope" })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("returns a 404 when the expense isn't in a group the user is in", async () => {
    getExpenseEditData.mockResolvedValueOnce({ ...editData, expense: null });
    await expect(page({ groupId, expenseId })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("tells anyone but the person who logged it that they can't edit it", async () => {
    getExpenseEditData.mockResolvedValueOnce({
      ...editData,
      expense: { ...editData.expense, createdBy: groupId },
    });
    render(await page({ groupId, expenseId }));

    expect(
      screen.getByText("Only the person who logged this expense can edit it."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("shows the edit form to the person who logged it", async () => {
    getExpenseEditData.mockResolvedValueOnce(editData);
    render(await page({ groupId, expenseId }));

    expect(
      screen.getByRole("heading", { name: "Edit expense" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to expenses" }),
    ).toHaveAttribute("href", `/groups/${groupId}/expenses`);
  });
});

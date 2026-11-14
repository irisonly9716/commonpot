import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InsightsView } from "@/components/insights/insights-view";
import type { SpendingExpense } from "@/lib/domain/spending";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/groups/g1/insights",
}));

afterEach(() => {
  cleanup();
  push.mockClear();
});

const me = "user-me";
const expenses: SpendingExpense[] = [
  {
    id: "a",
    expenseDate: "2026-10-03",
    amountCents: 9000,
    categoryName: "Groceries",
    shares: [
      { userId: me, amountCents: 3000 },
      { userId: "other", amountCents: 6000 },
    ],
  },
  {
    id: "b",
    expenseDate: "2026-10-20",
    amountCents: 2000,
    categoryName: "Utilities",
    shares: [
      { userId: me, amountCents: 1000 },
      { userId: "other", amountCents: 1000 },
    ],
  },
  {
    id: "c",
    expenseDate: "2026-09-12",
    amountCents: 4000,
    categoryName: "Groceries",
    shares: [{ userId: "other", amountCents: 4000 }],
  },
];

function renderView(month = "2026-10") {
  return render(
    <InsightsView
      groupName="Maple St. Apartment"
      currency="USD"
      currentUserId={me}
      month={month}
      latestMonth="2026-10"
      expenses={expenses}
    />,
  );
}

describe("US8 insights view", () => {
  it("starts on the Group view with the month's total and categories", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "Insights" })).toBeVisible();
    expect(screen.getByText("Total $110.00")).toBeVisible();
    expect(screen.getByRole("button", { name: "Group" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const list = within(screen.getByRole("list"));
    expect(list.getByText("Groceries")).toBeVisible();
    expect(list.getByText("$90.00 · 82%")).toBeVisible();
  });

  it("switches to Me and shows my shares, not what I paid", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "Me" }));
    expect(screen.getByText("Total $40.00")).toBeVisible();
    expect(
      within(screen.getByRole("list")).getByText("$30.00 · 75%"),
    ).toBeVisible();
  });

  it("shows a table with the same numbers for every chart", async () => {
    renderView();
    expect(
      screen.getByRole("img", { name: /spending by category/i }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Table" }));

    const categories = screen.getByRole("table", {
      name: "Spending by category, October 2026",
    });
    expect(within(categories).getByText("Groceries")).toBeVisible();
    expect(within(categories).getByText("$90.00")).toBeVisible();
    expect(within(categories).getByText("$110.00")).toBeVisible();

    const trend = screen.getByRole("table", { name: "Spending by month" });
    const rows = within(trend).getAllByRole("row");
    // header + 6 months
    expect(rows).toHaveLength(7);
    expect(within(trend).getByText("September 2026")).toBeVisible();
    expect(within(trend).getByText("$40.00")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Chart" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("goes to another month through the picker", async () => {
    renderView();
    await userEvent.selectOptions(screen.getByLabelText("Month"), "2026-09");
    expect(push).toHaveBeenCalledWith("/groups/g1/insights?month=2026-09");
  });

  it("offers the last 12 months, newest first", () => {
    renderView();
    const options = within(screen.getByLabelText("Month")).getAllByRole(
      "option",
    );
    expect(options).toHaveLength(12);
    expect(options[0]).toHaveTextContent("October 2026");
    expect(options[11]).toHaveTextContent("November 2025");
  });

  it("says so when the month has no spending", () => {
    renderView("2026-08");
    expect(screen.getByText("Total $0.00")).toBeVisible();
    expect(screen.getByText("No spending in August 2026.")).toBeVisible();
  });
});

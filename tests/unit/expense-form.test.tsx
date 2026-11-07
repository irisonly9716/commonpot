import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ExpenseForm,
  getLocalDateString,
} from "@/components/expenses/expense-form";

const members = [
  { id: "11111111-1111-4111-8111-111111111111", displayName: "You" },
  { id: "22222222-2222-4222-8222-222222222222", displayName: "Alex" },
  { id: "12121212-1212-4212-8212-121212121212", displayName: "Sam" },
];

const categories = [
  { id: "33333333-3333-4333-8333-333333333333", name: "Groceries" },
];

afterEach(cleanup);

describe("US3 expense form", () => {
  it("defaults to an equal split and shows formatted shares", async () => {
    render(
      <ExpenseForm
        groupId="group-1"
        currentUserId={members[0].id}
        members={members}
        categories={categories}
        currency="USD"
      />,
    );

    await userEvent.type(screen.getByLabelText("Amount"), "84.21");
    expect(screen.getByRole("radio", { name: "Equally" })).toBeChecked();
    expect(screen.getAllByText("$28.07")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Save expense" })).toBeEnabled();
  });

  it("keeps exact-mode save disabled until the difference is zero", async () => {
    const user = userEvent.setup();
    render(
      <ExpenseForm
        groupId="group-1"
        currentUserId={members[0].id}
        members={members}
        categories={categories}
        currency="USD"
      />,
    );

    await user.type(screen.getByLabelText("Amount"), "120.00");
    await user.click(screen.getByRole("radio", { name: "Exact amounts" }));
    expect(screen.getByText("$120.00 left to assign")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.queryByRole("alert")).not.toHaveTextContent(
      "$120.00 left to assign",
    );
    expect(screen.getByRole("button", { name: "Save expense" })).toBeDisabled();
  });

  it("shows the amount-specific validation message", async () => {
    const user = userEvent.setup();
    render(
      <ExpenseForm
        groupId="group-1"
        currentUserId={members[0].id}
        members={members}
        categories={categories}
        currency="USD"
      />,
    );

    await user.type(screen.getByLabelText("Amount"), "1.234");
    await user.click(screen.getByRole("button", { name: "Save expense" }));

    expect(
      screen.getByText(
        "Enter an amount greater than $0 with at most 2 decimals",
      ),
    ).toBeInTheDocument();
  });

  it("uses the local calendar date", () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(getLocalDateString(new Date("2026-11-08T01:30:00.000Z"))).toBe(
        "2026-11-07",
      );
    } finally {
      process.env.TZ = previousTimeZone;
    }
  });

  it("submits integer cents to the expense API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: "expense-1" })));
    render(
      <ExpenseForm
        groupId="group-1"
        currentUserId={members[0].id}
        members={members}
        categories={categories}
        currency="USD"
      />,
    );

    await user.type(screen.getByLabelText("Amount"), "84.21");
    await user.type(screen.getByLabelText("Description"), "Groceries");
    await user.click(screen.getByRole("button", { name: "Save expense" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/group-1/expenses",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByLabelText("Amount")).toHaveValue("");
    fetchMock.mockRestore();
  });
});

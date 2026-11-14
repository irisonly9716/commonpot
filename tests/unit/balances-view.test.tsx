import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

import { BalancesView } from "@/components/balances/balances-view";

const you = "11111111-1111-4111-8111-111111111111";
const alex = "22222222-2222-4222-8222-222222222222";
const sam = "12121212-1212-4212-8212-121212121212";

const members = [
  { id: you, displayName: "Admin User" },
  { id: alex, displayName: "Alex" },
  { id: sam, displayName: "Sam" },
];

const props = {
  groupId: "group-1",
  currentUserId: you,
  currency: "USD",
  members,
  balances: [
    {
      userId: you,
      displayName: "Admin User",
      balanceCents: 4250,
      status: "owed" as const,
    },
    {
      userId: alex,
      displayName: "Alex",
      balanceCents: -2800,
      status: "owes" as const,
    },
    {
      userId: sam,
      displayName: "Sam",
      balanceCents: -1450,
      status: "owes" as const,
    },
  ],
  settlements: [
    { fromUserId: alex, toUserId: you, amountCents: 2800 },
    { fromUserId: sam, toUserId: you, amountCents: 1450 },
  ],
  breakdowns: {
    [alex]: [
      {
        kind: "expense" as const,
        id: "e1",
        date: "2026-11-03",
        description: "Groceries",
        effectCents: -2800,
      },
    ],
  },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockReset();
});

describe("US5 balances view", () => {
  it("describes every balance in words and signs, not color alone", () => {
    render(<BalancesView {...props} />);

    expect(screen.getByText("You are owed")).toBeInTheDocument();
    expect(screen.getByText("+$42.50")).toBeInTheDocument();
    expect(screen.getByText("Alex owes")).toBeInTheDocument();
    expect(screen.getByText("−$28.00")).toBeInTheDocument();
    expect(screen.getByText("Balances add up to $0.00")).toBeInTheDocument();
  });

  it("shows the expenses and payments behind a balance", async () => {
    render(<BalancesView {...props} />);

    await userEvent.click(screen.getByText("Alex owes"));
    const details = screen.getByText("Groceries").closest("li");
    expect(details).not.toBeNull();
    expect(within(details as HTMLElement).getByText("−$28.00")).toBeVisible();
  });

  it("lists suggested payments and prefills one into the form", async () => {
    render(<BalancesView {...props} />);

    expect(screen.getByText("Alex pays you $28.00")).toBeInTheDocument();
    expect(screen.getByText("Sam pays you $14.50")).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Record this payment" })[0],
    );
    expect(screen.getByLabelText("Paid by")).toHaveValue(alex);
    expect(screen.getByLabelText("Paid to")).toHaveValue(you);
    expect(screen.getByLabelText("Amount")).toHaveValue("28.00");
  });

  it("records a payment in integer cents and refreshes the balances", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "payment-1" }), { status: 201 }),
      );
    render(<BalancesView {...props} />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Record this payment" })[1],
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Record payment" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/group-1/payments",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      paidBy: sam,
      paidTo: you,
      amountCents: 1450,
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("explains when someone tries to record a payment they weren't part of", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "You can only record a payment you made or received",
          },
        }),
        { status: 403 },
      ),
    );
    render(<BalancesView {...props} />);

    await userEvent.selectOptions(screen.getByLabelText("Paid by"), alex);
    await userEvent.selectOptions(screen.getByLabelText("Paid to"), sam);
    await userEvent.type(screen.getByLabelText("Amount"), "5");
    await userEvent.click(
      screen.getByRole("button", { name: "Record payment" }),
    );

    expect(
      await screen.findByText(
        "You can only record a payment you made or received.",
      ),
    ).toBeInTheDocument();
  });

  it("only offers to record suggestions the user is part of", () => {
    render(
      <BalancesView
        {...props}
        settlements={[{ fromUserId: alex, toUserId: sam, amountCents: 500 }]}
      />,
    );

    expect(screen.getByText("Alex pays Sam $5.00")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record this payment" }),
    ).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

import { ActivityFeed } from "@/components/activity/activity-feed";
import { AlertList } from "@/components/alerts/alert-list";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";

const admin = "11111111-1111-4111-8111-111111111111";
const alex = "22222222-2222-4222-8222-222222222222";
const sam = "12121212-1212-4212-8212-121212121212";

const members = [
  { id: admin, displayName: "Admin User" },
  { id: alex, displayName: "Alex" },
  { id: sam, displayName: "Sam" },
];

const expenses = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    amountCents: 8400,
    description: "Groceries",
    expenseDate: "2026-11-01",
    createdAt: "2026-11-01T10:00:00Z",
    paidBy: admin,
    createdBy: admin,
    categoryId: null,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    amountCents: 2500,
    description: "Pizza",
    expenseDate: "2026-11-08",
    createdAt: "2026-11-08T19:00:00Z",
    paidBy: alex,
    createdBy: alex,
    categoryId: null,
  },
];

function renderList(
  currentUserId: string,
  currentUserRole: "admin" | "member",
  onDeleted = vi.fn(),
) {
  render(
    <ExpenseList
      currency="USD"
      currentUserId={currentUserId}
      currentUserRole={currentUserRole}
      expenses={expenses}
      groupId="group-1"
      members={members}
      onDeleted={onDeleted}
    />,
  );
  return onDeleted;
}

function expenseCard(description: string) {
  return screen.getByRole("article", { name: description });
}

afterEach(() => {
  cleanup();
  refresh.mockReset();
  push.mockReset();
  vi.restoreAllMocks();
});

describe("US6 expense list controls", () => {
  it("shows Edit and Delete only to people allowed to use them", () => {
    renderList(alex, "member");

    const own = within(expenseCard("Pizza"));
    expect(own.getByRole("link", { name: "Edit Pizza" })).toHaveAttribute(
      "href",
      "/groups/group-1/expenses/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/edit",
    );
    expect(own.getByRole("button", { name: "Delete Pizza" })).toBeVisible();

    const others = within(expenseCard("Groceries"));
    expect(others.queryByRole("link", { name: /Edit/ })).toBeNull();
    expect(others.queryByRole("button", { name: /Delete/ })).toBeNull();
  });

  it("lets a group admin delete, but not edit, someone else's expense", () => {
    renderList(admin, "admin");

    const pizza = within(expenseCard("Pizza"));
    expect(pizza.queryByRole("link", { name: /Edit/ })).toBeNull();
    expect(pizza.getByRole("button", { name: "Delete Pizza" })).toBeVisible();
  });

  it("asks for confirmation and says who will be alerted", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderList(admin, "admin");
    const deleteButton = screen.getByRole("button", { name: "Delete Pizza" });

    await user.click(deleteButton);

    const dialog = screen.getByRole("alertdialog", {
      name: "Delete this expense?",
    });
    expect(dialog).toHaveTextContent("Pizza ($25.00)");
    expect(dialog).toHaveTextContent(
      "Alex will get an alert that you deleted it.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(deleteButton).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps keyboard focus inside the dialog", async () => {
    const user = userEvent.setup();
    renderList(alex, "member");

    await user.click(screen.getByRole("button", { name: "Delete Pizza" }));
    const dialog = screen.getByRole("alertdialog");
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const confirm = within(dialog).getByRole("button", {
      name: "Delete expense",
    });

    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    expect(dialog).not.toHaveTextContent("will get an alert");
  });

  it("deletes after confirming and refreshes the feed and balances", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const onDeleted = renderList(alex, "member");

    await user.click(screen.getByRole("button", { name: "Delete Pizza" }));
    await user.click(screen.getByRole("button", { name: "Delete expense" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/group-1/expenses/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onDeleted).toHaveBeenCalledWith(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText("Expense deleted.")).toBeInTheDocument();
  });

  it("explains when the server refuses the deletion", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 403 }),
    );
    const onDeleted = renderList(alex, "member");

    await user.click(screen.getByRole("button", { name: "Delete Pizza" }));
    await user.click(screen.getByRole("button", { name: "Delete expense" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You can't delete this expense.",
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe("US6 edit an expense", () => {
  const saved = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    amountCents: 12000,
    description: "Utilities",
    categoryId: null,
    expenseDate: "2026-11-05",
    paidBy: alex,
    shares: [
      { userId: alex, amountCents: 7000 },
      { userId: sam, amountCents: 5000 },
    ],
  };

  function renderEdit(onSaved = vi.fn()) {
    render(
      <ExpenseForm
        categories={[]}
        currency="USD"
        currentUserId={alex}
        expense={saved}
        groupId="group-1"
        members={members}
        onSaved={onSaved}
      />,
    );
    return onSaved;
  }

  it("opens with the saved values, including an exact split", () => {
    renderEdit();

    expect(
      screen.getByRole("heading", { name: "Edit expense" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveValue("120.00");
    expect(screen.getByLabelText("Description")).toHaveValue("Utilities");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-11-05");
    expect(screen.getByRole("radio", { name: "Exact amounts" })).toBeChecked();
    expect(screen.getByLabelText("Alex exact amount")).toHaveValue("70.00");
    expect(screen.getByLabelText("Sam exact amount")).toHaveValue("50.00");
    expect(
      screen.getByRole("checkbox", { name: /Admin User/ }),
    ).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("saves the changes with PATCH in integer cents", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ id: saved.id })));
    const onSaved = renderEdit();

    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Electricity");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/groups/group-1/expenses/${saved.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      amountCents: 12000,
      description: "Electricity",
      shares: [
        { userId: alex, amountCents: 7000 },
        { userId: sam, amountCents: 5000 },
      ],
    });
    expect(onSaved).toHaveBeenCalledWith(saved.id);
  });
});

describe("US6 alerts", () => {
  it("shows my alerts and marks one as read", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ id: "alert-1", readAt: "2026-11-09T12:00:00Z" }),
        ),
      );
    render(
      <AlertList
        alerts={[
          {
            id: "alert-1",
            groupId: "group-1",
            kind: "expense_deleted",
            message: "Admin User deleted your expense: Pizza",
            createdAt: "2026-11-09T11:00:00Z",
            readAt: null,
          },
        ]}
      />,
    );

    const alerts = screen.getByRole("region", { name: "Alerts" });
    expect(alerts).toHaveTextContent("Admin User deleted your expense: Pizza");

    await user.click(screen.getByRole("button", { name: "Mark as read" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/alerts/alert-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      }),
    );
    expect(screen.queryByText(/deleted your expense/)).toBeNull();
  });

  it("shows nothing when there are no alerts", () => {
    render(<AlertList alerts={[]} />);
    expect(screen.queryByRole("region", { name: "Alerts" })).toBeNull();
  });
});

describe("US6 activity feed", () => {
  it("says who added, edited and deleted what, newest first", () => {
    render(
      <ActivityFeed
        currency="USD"
        currentUserId={alex}
        items={[
          {
            id: "3",
            action: "deleted",
            description: "Pizza",
            amountCents: 2500,
            actorId: admin,
            actorName: "Admin User",
            createdAt: "2026-11-09T12:00:00Z",
          },
          {
            id: "2",
            action: "edited",
            description: "Pizza",
            amountCents: 2500,
            actorId: alex,
            actorName: "Alex",
            createdAt: "2026-11-09T11:00:00Z",
          },
          {
            id: "1",
            action: "payment_recorded",
            description: "Alex paid Admin User",
            amountCents: 1500,
            actorId: alex,
            actorName: "Alex",
            createdAt: "2026-11-09T10:00:00Z",
          },
        ]}
      />,
    );

    const items = within(
      screen.getByRole("region", { name: "Activity" }),
    ).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Admin User deleted Pizza · $25.00");
    expect(items[1]).toHaveTextContent("You edited Pizza · $25.00");
    expect(items[2]).toHaveTextContent(
      "You recorded a payment: Alex paid Admin User · $15.00",
    );
  });

  it("says so when nothing has happened yet", () => {
    render(<ActivityFeed currency="USD" currentUserId={alex} items={[]} />);
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });
});

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

// The hook itself is tested in use-group-realtime.test.tsx. Here it is replaced,
// so each test can set the connection status and fire a change by hand.
const live = vi.hoisted(() => ({
  status: "live",
  calls: [] as Array<{ groupId: string; userId: string }>,
  onChange: null as null | (() => void),
}));
vi.mock("@/lib/realtime/use-group-realtime", () => ({
  useGroupRealtime: (
    groupId: string,
    options: { userId: string; onChange: () => void },
  ) => {
    live.calls.push({ groupId, userId: options.userId });
    live.onChange = options.onChange;
    return { status: live.status };
  },
}));

import { AlertList } from "@/components/alerts/alert-list";
import { ExpensesPage } from "@/components/expenses/expenses-page";
import { ConnectionStatus } from "@/components/realtime/connection-status";
import { GroupLiveRefresh } from "@/components/realtime/group-live-refresh";

const groupId = "11111111-1111-4111-8111-111111111111";
const admin = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";

const members = [
  { id: admin, displayName: "Admin User" },
  { id: member, displayName: "Member User" },
];

const groceries = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  amountCents: 8400,
  description: "Groceries",
  expenseDate: "2026-11-01",
  createdAt: "2026-11-01T10:00:00Z",
  paidBy: admin,
  createdBy: admin,
  categoryId: null,
};

const pizza = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  amountCents: 2500,
  description: "Pizza added by Admin",
  expenseDate: "2026-11-13",
  createdAt: "2026-11-13T19:00:00Z",
  paidBy: admin,
  createdBy: admin,
  categoryId: null,
};

function renderExpensesPage() {
  return render(
    <ExpensesPage
      activity={[]}
      alerts={[]}
      categories={[]}
      currency="USD"
      currentUserId={member}
      currentUserRole="member"
      expenses={[groceries]}
      groupId={groupId}
      members={members}
    />,
  );
}

beforeEach(() => {
  live.status = "live";
  live.calls.length = 0;
  live.onChange = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refresh.mockClear();
});

describe("US4 see changes as they happen: connection status", () => {
  it('says "Reconnecting…" while real time is down', () => {
    render(<ConnectionStatus status="reconnecting" />);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });

  it("stays quiet while live updates work", () => {
    render(<ConnectionStatus status="live" />);
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.getByRole("status")).toHaveAttribute("data-status", "live");
  });
});

describe("US4 see changes as they happen: expenses page", () => {
  it("subscribes to this group for the signed-in member", () => {
    renderExpensesPage();
    expect(live.calls.at(-1)).toEqual({ groupId, userId: member });
  });

  it("shows another member's new expense without a reload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify([pizza, groceries])));
    renderExpensesPage();
    expect(screen.queryByText("Pizza added by Admin")).toBeNull();

    await act(async () => {
      live.onChange?.();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/groups/${groupId}/expenses`,
    );
    expect(await screen.findByText("Pizza added by Admin")).toBeVisible();
    // The activity feed and alerts come from the server data.
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the current list when the refetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    renderExpensesPage();

    await act(async () => {
      live.onChange?.();
    });

    expect(screen.getByText("Groceries")).toBeVisible();
  });

  it('shows "Reconnecting…" when the connection drops', () => {
    live.status = "reconnecting";
    renderExpensesPage();
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });
});

describe("US4 see changes as they happen: balances page", () => {
  it("re-renders the server data when someone else changes something", () => {
    render(<GroupLiveRefresh groupId={groupId} userId={member} />);
    expect(live.calls.at(-1)).toEqual({ groupId, userId: member });

    act(() => {
      live.onChange?.();
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows "Reconnecting…" when the connection drops', () => {
    live.status = "reconnecting";
    render(<GroupLiveRefresh groupId={groupId} userId={member} />);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });
});

describe("US4 see changes as they happen: alerts", () => {
  it("shows a new alert when the page data refreshes", () => {
    const view = render(<AlertList alerts={[]} />);
    expect(screen.queryByRole("region", { name: "Alerts" })).toBeNull();

    view.rerender(
      <AlertList
        alerts={[
          {
            id: "alert-2",
            groupId,
            kind: "expense_deleted",
            message: "Admin User deleted your expense: Taxi",
            createdAt: "2026-11-13T20:00:00Z",
            readAt: null,
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Alerts" })).toHaveTextContent(
      "Admin User deleted your expense: Taxi",
    );
  });
});

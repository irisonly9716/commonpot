import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemberList } from "@/components/groups/member-list";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  refresh.mockClear();
  push.mockClear();
  vi.unstubAllGlobals();
});

const members = [
  { userId: "u-me", displayName: "Alex", role: "admin" as const },
  { userId: "u-casey", displayName: "Casey", role: "member" as const },
  { userId: "u-sam", displayName: "Sam", role: "admin" as const },
];

function renderList(
  role: "admin" | "member" = "admin",
  currentUserId = "u-me",
) {
  return render(
    <MemberList
      groupId="g1"
      currentUserId={currentUserId}
      currentUserRole={role}
      currency="USD"
      members={members}
    />,
  );
}

function errorResponse(code: string, message: string, extra = {}) {
  return Response.json({ error: { code, message, ...extra } }, { status: 409 });
}

describe("US11 member list", () => {
  it("lists members with roles in words and marks you", () => {
    renderList();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Alex (you)");
    expect(items[0]).toHaveTextContent("Admin");
    expect(items[1]).toHaveTextContent("Casey");
    expect(items[1]).toHaveTextContent("Member");
  });

  it("shows an admin Promote and Remove for others, and Leave for themselves", () => {
    renderList();
    expect(screen.getByRole("button", { name: "Promote Casey" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove Casey" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Remove Sam" })).toBeVisible();
    // Sam is already an admin, so there is nothing to promote.
    expect(
      screen.queryByRole("button", { name: "Promote Sam" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave group" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Remove Alex" }),
    ).not.toBeInTheDocument();
  });

  it("shows a plain member only Leave group", () => {
    renderList("member", "u-casey");
    expect(screen.getByRole("button", { name: "Leave group" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Promote|Remove/ })).toBeNull();
  });

  it("promotes a member and refreshes", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ userId: "u-casey", role: "admin" }),
    );
    renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Promote Casey" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/g1/members/u-casey",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Casey is now an admin.",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("removes a member with a zero balance without asking", async () => {
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Remove Casey" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/g1/members/u-casey",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Casey was removed.",
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the balance in words and asks before removing someone who is owed", async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse("BALANCE_NOT_ZERO", "Balance is not zero", {
        balanceCents: 1250,
      }),
    );
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Remove Casey" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Casey is owed $12.50");
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    expect(refresh).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Remove anyway" }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/groups/g1/members/u-casey?confirm=true",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Casey was removed.",
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("says who owes what when the member owes money", async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse("BALANCE_NOT_ZERO", "Balance is not zero", {
        balanceCents: -4000,
      }),
    );
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Remove Casey" }));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Casey owes $40.00",
    );
  });

  it("cancels the confirmation with Escape and returns focus", async () => {
    fetchMock.mockResolvedValue(
      errorResponse("BALANCE_NOT_ZERO", "Balance is not zero", {
        balanceCents: 500,
      }),
    );
    renderList();
    const remove = screen.getByRole("button", { name: "Remove Casey" });
    await userEvent.click(remove);
    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(remove).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("leaves the group and goes to the group list", async () => {
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Leave group" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/g1/members/u-me",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(push).toHaveBeenCalledWith("/groups");
  });

  it("does not let you leave with a balance, and offers no override", async () => {
    fetchMock.mockResolvedValue(
      errorResponse("BALANCE_NOT_ZERO", "Balance is not zero", {
        balanceCents: -2500,
      }),
    );
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Leave group" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You owe $25.00. Settle up before you leave.",
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("tells the last admin to promote someone first", async () => {
    fetchMock.mockResolvedValue(
      errorResponse("LAST_ADMIN", "A group needs at least one admin"),
    );
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Leave group" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You are the only admin. Promote another member before you leave.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the server's message for any other failure", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only group admins can do this",
          },
        },
        { status: 403 },
      ),
    );
    renderList();
    await userEvent.click(
      screen.getByRole("button", { name: "Promote Casey" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only group admins can do this",
    );
  });
});

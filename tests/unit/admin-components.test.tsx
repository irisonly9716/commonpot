import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminGroupTable } from "@/components/admin/admin-group-table";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import { DefaultCategoryEditor } from "@/components/admin/default-category-editor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(Response.json({}, { status: 200 }));
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  refresh.mockClear();
  vi.unstubAllGlobals();
});

const users = [
  {
    id: "u-self",
    email: "site-admin@example.com",
    displayName: "Site Admin",
    createdAt: "2026-11-03T10:00:00Z",
    suspendedAt: null,
    isSiteAdmin: true,
    groupCount: 0,
    expenseCount: 0,
  },
  {
    id: "u-casey",
    email: "casey@example.com",
    displayName: "Casey",
    createdAt: "2026-11-05T10:00:00Z",
    suspendedAt: null,
    isSiteAdmin: false,
    groupCount: 2,
    expenseCount: 7,
  },
  {
    id: "u-sam",
    email: "sam@example.com",
    displayName: "Sam",
    createdAt: "2026-11-06T10:00:00Z",
    suspendedAt: "2026-11-10T10:00:00Z",
    isSiteAdmin: false,
    groupCount: 1,
    expenseCount: 0,
  },
];

describe("US12 admin user table", () => {
  it("lists users with sign-up date, status and counts", () => {
    render(<AdminUserTable users={users} currentUserId="u-self" />);
    const table = screen.getByRole("table", { name: "Users" });
    const casey = within(table).getByRole("row", { name: /Casey/ });
    expect(within(casey).getByText("casey@example.com")).toBeVisible();
    expect(within(casey).getByText("Nov 5, 2026")).toBeVisible();
    expect(within(casey).getByText("Active")).toBeVisible();
    expect(within(casey).getByText("2")).toBeVisible();
    expect(within(casey).getByText("7")).toBeVisible();
    const sam = within(table).getByRole("row", { name: /Sam/ });
    expect(within(sam).getByText("Suspended")).toBeVisible();
  });

  it("shows no money anywhere", () => {
    render(<AdminUserTable users={users} currentUserId="u-self" />);
    expect(document.body.textContent).not.toMatch(/\$|amount|cents/i);
  });

  it("suspends an active user and refreshes the page", async () => {
    render(<AdminUserTable users={users} currentUserId="u-self" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Suspend Casey" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/users/u-casey",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ suspended: true }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Casey is suspended.",
    );
  });

  it("reactivates a suspended user", async () => {
    render(<AdminUserTable users={users} currentUserId="u-self" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Reactivate Sam" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/users/u-sam",
      expect.objectContaining({ body: JSON.stringify({ suspended: false }) }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sam is active again.",
    );
  });

  it("offers no suspend button on your own row", () => {
    render(<AdminUserTable users={users} currentUserId="u-self" />);
    expect(
      screen.queryByRole("button", { name: /Site Admin/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("You")).toBeVisible();
  });

  it("shows the server's message when it fails", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "CONFLICT", message: "Nope, not allowed" } },
        { status: 409 },
      ),
    );
    render(<AdminUserTable users={users} currentUserId="u-self" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Suspend Casey" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nope, not allowed",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("US12 admin group table", () => {
  it("lists groups with creation date and counts", () => {
    render(
      <AdminGroupTable
        groups={[
          {
            id: "g1",
            name: "Maple St.",
            createdAt: "2026-11-04T10:00:00Z",
            memberCount: 3,
            expenseCount: 12,
          },
        ]}
      />,
    );
    const table = screen.getByRole("table", { name: "Groups" });
    const row = within(table).getByRole("row", { name: /Maple St\./ });
    expect(within(row).getByText("Nov 4, 2026")).toBeVisible();
    expect(within(row).getByText("3")).toBeVisible();
    expect(within(row).getByText("12")).toBeVisible();
  });

  it("says so when there are no groups", () => {
    render(<AdminGroupTable groups={[]} />);
    expect(screen.getByText("No groups yet.")).toBeVisible();
  });
});

describe("US12 default category editor", () => {
  const categories = [
    { id: "c1", name: "Groceries", isArchived: false },
    { id: "c2", name: "Travel", isArchived: true },
  ];

  it("adds a category", async () => {
    render(<DefaultCategoryEditor categories={categories} />);
    await userEvent.type(screen.getByLabelText("New category"), "Pets");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/default-categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Pets" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("renames a category", async () => {
    render(<DefaultCategoryEditor categories={categories} />);
    const input = screen.getByLabelText("Name of Groceries");
    await userEvent.clear(input);
    await userEvent.type(input, "Food");
    await userEvent.click(
      screen.getByRole("button", { name: "Save Groceries" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/default-categories/c1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Food" }),
      }),
    );
  });

  it("archives and restores", async () => {
    render(<DefaultCategoryEditor categories={categories} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Archive Groceries" }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/admin/default-categories/c1",
      expect.objectContaining({ body: JSON.stringify({ isArchived: true }) }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Restore Travel" }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/admin/default-categories/c2",
      expect.objectContaining({ body: JSON.stringify({ isArchived: false }) }),
    );
  });

  it("deletes a category", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(<DefaultCategoryEditor categories={categories} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete Travel" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/default-categories/c2",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the message when a name is already taken", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: { code: "CONFLICT", message: "That category already exists" },
        },
        { status: 409 },
      ),
    );
    render(<DefaultCategoryEditor categories={categories} />);
    await userEvent.type(screen.getByLabelText("New category"), "Groceries");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That category already exists",
    );
  });

  it("marks archived categories in words", () => {
    render(<DefaultCategoryEditor categories={categories} />);
    expect(screen.getByText("Archived")).toBeVisible();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryList } from "@/components/groups/category-list";

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

const categories = [
  { id: "c1", name: "Groceries", isArchived: false },
  { id: "c2", name: "Travel", isArchived: true },
];

describe("US11 category list", () => {
  it("adds a category", async () => {
    render(<CategoryList groupId="g1" categories={categories} />);
    await userEvent.type(screen.getByLabelText("New category"), "Pets");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/g1/categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Pets" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("renames a category once the name has changed", async () => {
    render(<CategoryList groupId="g1" categories={categories} />);
    expect(
      screen.queryByRole("button", { name: "Save Groceries" }),
    ).not.toBeInTheDocument();
    const input = screen.getByLabelText("Name of Groceries");
    await userEvent.clear(input);
    await userEvent.type(input, "Food");
    await userEvent.click(
      screen.getByRole("button", { name: "Save Groceries" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groups/g1/categories/c1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Food" }),
      }),
    );
  });

  it("archives and restores", async () => {
    render(<CategoryList groupId="g1" categories={categories} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Archive Groceries" }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/groups/g1/categories/c1",
      expect.objectContaining({ body: JSON.stringify({ isArchived: true }) }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Restore Travel" }),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/groups/g1/categories/c2",
      expect.objectContaining({ body: JSON.stringify({ isArchived: false }) }),
    );
  });

  it("marks archived categories in words", () => {
    render(<CategoryList groupId="g1" categories={categories} />);
    expect(screen.getByText("Archived")).toBeVisible();
  });

  it("shows the server's message when a name is taken", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: { code: "CONFLICT", message: "That category already exists" },
        },
        { status: 409 },
      ),
    );
    render(<CategoryList groupId="g1" categories={categories} />);
    await userEvent.type(screen.getByLabelText("New category"), "Groceries");
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That category already exists",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MySpending } from "@/components/ledger/my-spending";

const household = "11111111-1111-4111-8111-111111111111";

type Call = { url: string; method: string; body?: unknown };

const coffee = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  amountCents: 1000,
  description: "Coffee beans",
  category: "Groceries",
  expenseDate: "2026-11-03",
  createdAt: "2026-11-03T10:00:00Z",
  updatedAt: "2026-11-03T10:00:00Z",
};

function spending(month: string, totalCents: number) {
  const monthNumber = Number(month.slice(5));
  return {
    month,
    currencies: [
      {
        currency: "USD",
        totalCents,
        byCategory:
          totalCents === 0
            ? []
            : [
                {
                  key: "Groceries",
                  label: "Groceries",
                  amountCents: totalCents,
                  percent: 100,
                },
              ],
        bySource:
          totalCents === 0
            ? []
            : [
                {
                  key: "personal",
                  label: "Personal",
                  amountCents: 1000,
                  percent: 63,
                },
                {
                  key: household,
                  label: "Iris household",
                  amountCents: totalCents - 1000,
                  percent: 37,
                },
              ],
        trend: Array.from({ length: 6 }, (_, index) => ({
          month: `2026-${String(monthNumber - 5 + index).padStart(2, "0")}`,
          amountCents: index === 5 ? totalCents : 0,
        })),
      },
    ],
  };
}

let calls: Call[] = [];
let expenses: Array<typeof coffee> = [];
let totalCents = 1600;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  calls = [];
  expenses = [coffee];
  totalCents = 1600;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (method === "GET" && url.startsWith("/api/v1/me/spending")) {
      const month = new URL(url, "http://localhost").searchParams.get("month");
      return json(spending(month ?? "2026-11", totalCents));
    }
    if (method === "GET" && url.startsWith("/api/v1/personal-expenses")) {
      return json(expenses);
    }
    if (method === "POST") return json({ ...coffee, ...body, id: "new" }, 201);
    if (method === "PATCH") return json({ ...coffee, ...body });
    if (method === "DELETE") return new Response(null, { status: 204 });
    return json({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function spendingFetches() {
  return calls.filter(
    (call) =>
      call.method === "GET" && call.url.startsWith("/api/v1/me/spending"),
  );
}

async function renderPage() {
  render(<MySpending initialMonth="2026-11" />);
  await screen.findByText("Coffee beans");
}

describe("US10 my personal ledger: My spending page", () => {
  it("shows the month's total by category, by source and over 6 months", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "My spending" })).toBeVisible();
    expect(screen.getByLabelText("Month")).toHaveValue("2026-11");
    expect(screen.getByText(/Total in November 2026/)).toHaveTextContent(
      "Total in November 2026: $16.00",
    );
    expect(
      within(screen.getByRole("table", { name: "By category" })).getByRole(
        "row",
        { name: /Groceries/ },
      ),
    ).toHaveTextContent("$16.00");
    const sources = screen.getByRole("table", { name: "By source" });
    expect(
      within(sources).getByRole("row", { name: /Personal/ }),
    ).toHaveTextContent("$10.00");
    expect(
      within(sources).getByRole("row", { name: /Iris household/ }),
    ).toHaveTextContent("$6.00");
    expect(
      within(screen.getByRole("table", { name: "Last 6 months" })).getAllByRole(
        "row",
      ),
    ).toHaveLength(7); // a header row and 6 months
  });

  it("loads the personal expenses and totals for the chosen month", async () => {
    await renderPage();
    expect(calls).toContainEqual({
      url: "/api/v1/me/spending?month=2026-11",
      method: "GET",
      body: undefined,
    });
    expect(calls).toContainEqual({
      url: "/api/v1/personal-expenses?month=2026-11",
      method: "GET",
      body: undefined,
    });

    fireEvent.change(screen.getByLabelText("Month"), {
      target: { value: "2026-10" },
    });
    await waitFor(() =>
      expect(calls.map((call) => call.url)).toContain(
        "/api/v1/me/spending?month=2026-10",
      ),
    );
  });

  it("adds a personal expense in cents and refreshes the totals", async () => {
    const user = userEvent.setup();
    await renderPage();
    const before = spendingFetches().length;

    const form = screen.getByRole("form", { name: "Add a personal expense" });
    await user.type(within(form).getByLabelText("Amount"), "12.50");
    await user.type(within(form).getByLabelText("Description"), "Notebook");
    await user.type(within(form).getByLabelText("Category"), "School");
    await user.clear(within(form).getByLabelText("Date"));
    await user.type(within(form).getByLabelText("Date"), "2026-11-14");
    await user.click(within(form).getByRole("button", { name: "Add expense" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        url: "/api/v1/personal-expenses",
        method: "POST",
        body: {
          amountCents: 1250,
          description: "Notebook",
          category: "School",
          expenseDate: "2026-11-14",
        },
      }),
    );
    await waitFor(() =>
      expect(spendingFetches().length).toBeGreaterThan(before),
    );
  });

  it("shows field errors instead of sending a bad expense", async () => {
    const user = userEvent.setup();
    await renderPage();

    const form = screen.getByRole("form", { name: "Add a personal expense" });
    await user.type(within(form).getByLabelText("Amount"), "12.345");
    await user.click(within(form).getByRole("button", { name: "Add expense" }));

    expect(await within(form).findByText(/at most 2 decimals/)).toBeVisible();
    expect(within(form).getByLabelText("Amount")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("edits a personal expense", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Coffee beans" }));
    const form = screen.getByRole("form", { name: "Edit personal expense" });
    expect(within(form).getByLabelText("Amount")).toHaveValue("10.00");
    expect(within(form).getByLabelText("Description")).toHaveValue(
      "Coffee beans",
    );
    await user.clear(within(form).getByLabelText("Amount"));
    await user.type(within(form).getByLabelText("Amount"), "11");
    await user.click(
      within(form).getByRole("button", { name: "Save changes" }),
    );

    await waitFor(() =>
      expect(calls).toContainEqual({
        url: `/api/v1/personal-expenses/${coffee.id}`,
        method: "PATCH",
        body: {
          amountCents: 1100,
          description: "Coffee beans",
          category: "Groceries",
          expenseDate: "2026-11-03",
        },
      }),
    );
  });

  it("asks before deleting a personal expense", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(
      screen.getByRole("button", { name: "Delete Coffee beans" }),
    );
    expect(screen.getByText("Delete Coffee beans?")).toBeVisible();
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Delete expense" }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        url: `/api/v1/personal-expenses/${coffee.id}`,
        method: "DELETE",
        body: undefined,
      }),
    );
  });

  it("says so when the month has no spending", async () => {
    expenses = [];
    totalCents = 0;
    render(<MySpending initialMonth="2026-11" />);

    expect(
      await screen.findByText("No personal expenses in November 2026."),
    ).toBeVisible();
    expect(screen.getByText("Nothing spent in November 2026.")).toBeVisible();
  });

  it("explains when the data can't be loaded", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      json({ error: { code: "DATABASE_ERROR", message: "Down" } }, 500),
    );
    render(<MySpending initialMonth="2026-11" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load your spending. Try again.",
    );
  });
});

import { expect, test } from "@playwright/test";

const groupId = "11111111-1111-4111-8111-111111111111";
// The seed expenses are dated in November 2026, so the test asks for that
// month instead of "this month", which would be empty from December.
const month = "2026-11";

function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function signInTo(
  page: import("@playwright/test").Page,
  email: string,
  path: string,
) {
  await page.goto(`/sign-in?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("US8 see where the money goes", () => {
  test("shows Group and Me views, a month picker, and a table for each chart", async ({
    page,
  }) => {
    await signInTo(
      page,
      "member@example.com",
      `/groups/${groupId}/insights?month=${month}`,
    );

    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.getByRole("img", { name: /by category/i })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /last 6 months/i }),
    ).toBeVisible();

    // What the expense list API says the group spent in November.
    const response = await page.request.get(
      `/api/v1/groups/${groupId}/expenses`,
    );
    expect(response.ok()).toBe(true);
    const list = (await response.json()) as Array<{
      expenseDate: string;
      amountCents: number;
    }>;
    const expectedCents = list
      .filter((expense) => expense.expenseDate.startsWith(month))
      .reduce((sum, expense) => sum + expense.amountCents, 0);
    expect(expectedCents).toBeGreaterThan(0);

    // The page's total, its category table and its trend table all match it.
    await expect(page.getByText(/^Total \$/)).toHaveText(
      `Total ${usd(expectedCents)}`,
    );
    await page.getByRole("button", { name: "Table" }).click();
    const categories = page.getByRole("table", { name: /by category/i });
    await expect(categories.getByRole("row").last()).toContainText(
      usd(expectedCents),
    );
    const trend = page.getByRole("table", { name: "Spending by month" });
    await expect(
      trend.getByRole("row", { name: /November 2026/ }),
    ).toContainText(usd(expectedCents));

    // Me shows my share, which can't be more than the group's total.
    await page.getByRole("button", { name: "Me" }).click();
    await expect(page.getByRole("button", { name: "Me" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const myTotal = (await page.getByText(/^Total \$/).innerText()).replace(
      "Total ",
      "",
    );
    const toCents = (text: string) =>
      Math.round(Number(text.replace(/[^0-9.]/g, "")) * 100);
    expect(toCents(myTotal)).toBeLessThanOrEqual(expectedCents);

    // Another month goes through the URL and keeps working.
    await page
      .getByRole("combobox", { name: "Month" })
      .selectOption({ label: "October 2026" });
    await expect(page).toHaveURL(/insights\?month=2026-10$/);
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
  });

  test("keeps the month picker in step with an older month in the address", async ({
    page,
  }) => {
    await signInTo(
      page,
      "member@example.com",
      `/groups/${groupId}/insights?month=2020-01`,
    );

    const picker = page.getByRole("combobox", { name: "Month" });
    await expect(picker).toHaveValue("2020-01");
    await expect(page.getByText("No spending in January 2020.")).toBeVisible();
  });

  test("opens on the visitor's own current month when none is given", async ({
    page,
  }) => {
    await signInTo(page, "member@example.com", `/groups/${groupId}/insights`);
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Month" })).toHaveValue(
      local,
    );
  });

  test("returns 404 for someone who is not in the group", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("site-admin@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/groups$/);
    const response = await page.goto(`/groups/${groupId}/insights`);
    expect(response?.status()).toBe(404);
  });
});

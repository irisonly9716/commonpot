import { expect, test } from "@playwright/test";

const groupId = "11111111-1111-4111-8111-111111111111";

test.describe("US8 see where the money goes", () => {
  test("shows Group and Me views, a month picker, and a table for each chart", async ({
    page,
  }) => {
    await page.goto("/sign-in?next=%2Fgroups%2F" + groupId + "%2Finsights");
    await page.getByLabel("Email").fill("member@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.getByRole("img", { name: /by category/i })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /last 6 months/i }),
    ).toBeVisible();

    // The header total and the table's total row are the same number.
    const headerTotal = (await page.getByText(/^Total \$/).innerText()).replace(
      "Total ",
      "",
    );
    await page.getByRole("button", { name: "Table" }).click();
    const categories = page.getByRole("table", { name: /by category/i });
    await expect(categories.getByRole("row").last()).toContainText(headerTotal);
    await expect(
      page.getByRole("table", { name: "Spending by month" }),
    ).toBeVisible();

    // Me shows my share, which can't be more than the group's total.
    await page.getByRole("button", { name: "Me" }).click();
    await expect(page.getByRole("button", { name: "Me" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const toCents = (text: string) =>
      Math.round(Number(text.replace(/[^0-9.]/g, "")) * 100);
    const myTotal = (await page.getByText(/^Total \$/).innerText()).replace(
      "Total ",
      "",
    );
    expect(toCents(myTotal)).toBeLessThanOrEqual(toCents(headerTotal));

    // Another month goes through the URL and keeps working.
    await page.getByLabel("Month").selectOption({ index: 1 });
    await expect(page).toHaveURL(/insights\?month=\d{4}-\d{2}$/);
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
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

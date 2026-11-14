import { expect, test, type Browser, type Page } from "@playwright/test";

// Both people are in the seeded "Iris household" group (supabase/seed.sql).
const groupId = "11111111-1111-4111-8111-111111111111";
const expensesPath = `/groups/${groupId}/expenses`;
const password = "password123";

async function openExpensesAs(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(expensesPath);
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${expensesPath}$`));
  // Wait until the server has confirmed the live subscription.
  await expect(page.locator('[data-status="live"]')).toBeAttached({
    timeout: 15_000,
  });
  return { context, page };
}

async function addExpense(page: Page, description: string) {
  await page.getByLabel("Amount").fill("12.34");
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Save expense" }).click();
  await expect(page.getByRole("article", { name: description })).toBeVisible();
}

test.describe("US4 see changes as they happen", () => {
  test.setTimeout(90_000);

  test("shows another member's new and deleted expense within 2 seconds", async ({
    browser,
  }) => {
    const admin = await openExpensesAs(browser, "admin@example.com");
    const member = await openExpensesAs(browser, "member@example.com");
    const description = `Live dinner ${Date.now()}`;

    await addExpense(admin.page, description);
    await expect(
      member.page.getByRole("article", { name: description }),
    ).toBeVisible({ timeout: 2000 });
    await expect(
      member.page.getByRole("region", { name: "Activity" }),
    ).toContainText(`Admin User added ${description}`, { timeout: 2000 });

    await admin.page
      .getByRole("button", { name: `Delete ${description}`, exact: true })
      .click();
    await admin.page
      .getByRole("button", { name: "Delete expense", exact: true })
      .click();
    await expect(
      admin.page.getByRole("article", { name: description }),
    ).toHaveCount(0);
    await expect(
      member.page.getByRole("article", { name: description }),
    ).toHaveCount(0, { timeout: 2000 });

    await admin.context.close();
    await member.context.close();
  });

  test('says "Reconnecting…" while offline and catches up without duplicates', async ({
    browser,
  }) => {
    const admin = await openExpensesAs(browser, "admin@example.com");
    const member = await openExpensesAs(browser, "member@example.com");
    const description = `Offline lunch ${Date.now()}`;

    await member.context.setOffline(true);
    await expect(member.page.getByText("Reconnecting…")).toBeVisible();

    await addExpense(admin.page, description);
    await member.context.setOffline(false);

    await expect(
      member.page.getByRole("article", { name: description }),
    ).toHaveCount(1, { timeout: 10_000 });
    await expect(member.page.locator('[data-status="live"]')).toBeAttached({
      timeout: 10_000,
    });
    await expect(member.page.getByText("Reconnecting…")).toHaveCount(0);

    await admin.context.close();
    await member.context.close();
  });
});

import { expect, test } from "@playwright/test";

test.describe("US10 my personal ledger", () => {
  test.setTimeout(60_000);

  test("logs, edits and deletes a personal expense, and the totals follow", async ({
    page,
  }) => {
    await page.goto("/sign-in?next=%2Fgroups");
    await page.getByLabel("Email").fill("member@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/groups$/);

    await page.getByRole("link", { name: "My spending" }).click();
    await expect(page).toHaveURL(/\/me\/spending/);
    await expect(
      page.getByRole("heading", { name: "My spending" }),
    ).toBeVisible();
    const sources = page.getByRole("table", { name: "By source" });
    const ledger = page.getByRole("region", { name: "Personal expenses" });

    const description = `Train ticket ${Date.now()}`;
    const form = page.getByRole("form", { name: "Add a personal expense" });
    await form
      .getByRole("textbox", { name: "Amount", exact: true })
      .fill("7.25");
    await form
      .getByRole("textbox", { name: "Description", exact: true })
      .fill(description);
    await form
      .getByRole("combobox", { name: "Category", exact: true })
      .fill("Transport");
    await form.getByRole("button", { name: "Add expense" }).click();

    await expect(ledger.getByText(description)).toBeVisible();
    await expect(sources.getByRole("row", { name: /Personal/ })).toBeVisible();

    await ledger
      .getByRole("button", { name: `Edit ${description}`, exact: true })
      .click();
    const editForm = page.getByRole("form", { name: "Edit personal expense" });
    await editForm
      .getByRole("textbox", { name: "Amount", exact: true })
      .fill("8.00");
    await editForm.getByRole("button", { name: "Save changes" }).click();
    await expect(
      ledger.getByRole("listitem").filter({ hasText: description }),
    ).toContainText("$8.00");

    await ledger
      .getByRole("button", { name: `Delete ${description}`, exact: true })
      .click();
    await ledger
      .getByRole("button", { name: "Delete expense", exact: true })
      .click();
    await expect(ledger.getByText(description)).toHaveCount(0);
  });

  test("keeps my ledger out of other people's view", async ({ browser }) => {
    const description = `Private gift ${Date.now()}`;

    const member = await browser.newContext();
    const memberPage = await member.newPage();
    await memberPage.goto("/sign-in?next=%2Fme%2Fspending");
    await memberPage.getByLabel("Email").fill("member@example.com");
    await memberPage.getByLabel("Password").fill("password123");
    await memberPage.getByRole("button", { name: "Sign in" }).click();
    const form = memberPage.getByRole("form", {
      name: "Add a personal expense",
    });
    await form.getByRole("textbox", { name: "Amount", exact: true }).fill("20");
    await form
      .getByRole("textbox", { name: "Description", exact: true })
      .fill(description);
    await form
      .getByRole("combobox", { name: "Category", exact: true })
      .fill("Gifts");
    await form.getByRole("button", { name: "Add expense" }).click();
    await expect(memberPage.getByText(description)).toBeVisible();

    // The group admin opens their own My spending page and never sees it.
    const admin = await browser.newContext();
    const adminPage = await admin.newPage();
    await adminPage.goto("/sign-in?next=%2Fme%2Fspending");
    await adminPage.getByLabel("Email").fill("admin@example.com");
    await adminPage.getByLabel("Password").fill("password123");
    await adminPage.getByRole("button", { name: "Sign in" }).click();
    await expect(
      adminPage.getByRole("heading", { name: "My spending" }),
    ).toBeVisible();
    await expect(
      adminPage.getByRole("region", { name: "Personal expenses" }),
    ).toBeVisible();
    await expect(adminPage.getByText(description)).toHaveCount(0);

    await member.close();
    await admin.close();
  });
});

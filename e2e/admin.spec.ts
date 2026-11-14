import { expect, test, type Browser, type Page } from "@playwright/test";

const password = "password123";

async function signedInPage(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/groups$/);
  return page;
}

async function signUpPage(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-up");
  await page.getByLabel("Display name").fill("Soon Suspended");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/groups$/);
  return page;
}

test.describe("US12 keep the platform healthy", () => {
  test("a plain member gets 403 on the dashboard", async ({ browser }) => {
    const page = await signedInPage(browser, "member@example.com");
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(403);
    await expect(page.getByRole("table")).toHaveCount(0);
  });

  test("a site admin sees users and groups with counts and no amounts", async ({
    browser,
  }) => {
    const admin = await signedInPage(browser, "site-admin@example.com");
    await admin.goto("/admin");
    await expect(
      admin.getByRole("heading", { name: "Site admin" }),
    ).toBeVisible();
    const users = admin.getByRole("table", { name: "Users" });
    await expect(
      users.getByRole("row", { name: /admin@example\.com/ }).first(),
    ).toBeVisible();
    await expect(admin.getByRole("table", { name: "Groups" })).toBeVisible();
    await expect(admin.getByRole("main")).not.toContainText("$");
    await expect(admin.getByRole("main")).not.toContainText("Groceries");
  });

  test("suspending signs the user out on their next page, and reactivating lets them back in", async ({
    browser,
  }) => {
    const email = `suspend-e2e-${Date.now()}@example.com`;
    const user = await signUpPage(browser, email);
    const admin = await signedInPage(browser, "site-admin@example.com");

    await admin.goto("/admin");
    await admin
      .getByRole("button", { name: "Suspend Soon Suspended" })
      .first()
      .click();
    await expect(admin.getByRole("status")).toContainText(
      "Soon Suspended is suspended.",
    );

    // Their open browser session ends on the next page they load.
    await user.goto("/groups");
    await expect(user).toHaveURL(/\/sign-in/);

    // And they cannot sign in again.
    await user.getByLabel("Email").fill(email);
    await user.getByLabel("Password").fill(password);
    await user.getByRole("button", { name: "Sign in" }).click();
    await expect(user.locator("form").getByRole("alert")).toBeVisible();
    await expect(user).toHaveURL(/\/sign-in/);

    await admin
      .getByRole("button", { name: "Reactivate Soon Suspended" })
      .first()
      .click();
    await expect(admin.getByRole("status")).toContainText(
      "Soon Suspended is active again.",
    );
    await user.getByRole("button", { name: "Sign in" }).click();
    await expect(user).toHaveURL(/\/groups$/);
  });

  test("a site admin edits the default categories", async ({ browser }) => {
    const admin = await signedInPage(browser, "site-admin@example.com");
    await admin.goto("/admin");
    const name = `E2E category ${Date.now()}`;
    await admin.getByLabel("New category").fill(name);
    await admin.getByRole("button", { name: "Add category" }).click();
    await expect(admin.getByLabel(`Name of ${name}`)).toBeVisible();
    await admin.getByRole("button", { name: `Delete ${name}` }).click();
    await expect(admin.getByLabel(`Name of ${name}`)).toHaveCount(0);
  });
});

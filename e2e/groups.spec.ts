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

async function createGroup(page: Page, name: string) {
  await page.getByLabel("Group name").fill(name);
  await page.getByLabel("Currency").selectOption("EUR");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function createInviteLink(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Create invite link" }).click();
  const link = page.getByLabel("Invite link").first();
  await expect(link).toHaveValue(/\/invite\/.+/);
  return link.inputValue();
}

test.describe("US2 start a shared account", () => {
  test("creates a group as admin, invites someone by link, and joins once", async ({
    browser,
  }) => {
    const name = `E2E flat ${Date.now()}`;
    const creator = await signedInPage(browser, "member@example.com");
    await createGroup(creator, name);
    await expect(
      creator.getByRole("listitem").filter({ hasText: "Admin" }),
    ).toHaveCount(1);
    const inviteUrl = await createInviteLink(creator);

    // A guest opens the link while signed out, signs in, and lands in the group.
    const guest = await (await browser.newContext()).newPage();
    await guest.goto(inviteUrl);
    await expect(guest).toHaveURL(/\/sign-in\?next=%2Finvite%2F/);
    await guest.getByLabel("Email").fill("other-member@example.com");
    await guest.getByLabel("Password").fill(password);
    await guest.getByRole("button", { name: "Sign in" }).click();
    await expect(guest).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    await expect(guest.getByRole("heading", { name })).toBeVisible();
    const memberRows = guest
      .getByRole("listitem")
      .filter({ hasText: /Admin|Member/ });
    await expect(memberRows).toHaveCount(2);

    // Opening the same link again does not add them twice.
    await guest.goto(inviteUrl);
    await expect(guest).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
    await expect(
      guest.getByRole("listitem").filter({ hasText: /Admin|Member/ }),
    ).toHaveCount(2);
  });

  test("shows a clear message for a revoked link", async ({ browser }) => {
    const creator = await signedInPage(browser, "member@example.com");
    await createGroup(creator, `E2E revoke ${Date.now()}`);
    const inviteUrl = await createInviteLink(creator);

    await creator.getByRole("button", { name: "Revoke invite link" }).click();
    await expect(creator.getByLabel("Invite link")).toHaveCount(0);

    const guest = await signedInPage(browser, "third-member@example.com");
    await guest.goto(inviteUrl);
    await expect(guest.getByRole("alert")).toHaveText(
      "This invite link has expired or was revoked.",
    );
  });

  test("hides the invite controls from a plain member", async ({ browser }) => {
    const member = await signedInPage(browser, "member@example.com");
    await member.goto("/groups/11111111-1111-4111-8111-111111111111");
    await expect(
      member.getByRole("heading", { name: "Members" }),
    ).toBeVisible();
    await expect(
      member.getByRole("button", { name: "Create invite link" }),
    ).toHaveCount(0);
  });
});

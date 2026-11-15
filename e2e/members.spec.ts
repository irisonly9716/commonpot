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
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function inviteLink(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Create invite link" }).click();
  const link = page.getByRole("textbox", { name: "Invite link" }).first();
  await expect(link).toHaveValue(/\/invite\/.+/);
  return link.inputValue();
}

/** Creates a group as member@, and has other-member@ join it through the link. */
async function groupWithGuest(browser: Browser, name: string) {
  const creator = await signedInPage(browser, "member@example.com");
  await createGroup(creator, name);
  const url = await inviteLink(creator);
  const guest = await signedInPage(browser, "other-member@example.com");
  await guest.goto(url);
  await expect(guest).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await creator.reload();
  await expect(creator.getByRole("button", { name: /^Remove / })).toBeVisible();
  return { creator, guest };
}

test.describe("US11 manage the group", () => {
  test("an admin promotes a member, who can then leave without a balance", async ({
    browser,
  }) => {
    const { creator, guest } = await groupWithGuest(
      browser,
      `E2E promote ${Date.now()}`,
    );

    await creator.getByRole("button", { name: /^Promote / }).click();
    await expect(creator.getByRole("status")).toContainText("is now an admin.");
    await expect(
      creator.getByRole("button", { name: /^Promote / }),
    ).toHaveCount(0);

    // The new admin sees admin controls after a reload, then leaves.
    await guest.reload();
    await expect(
      guest.getByRole("heading", { name: "Categories", exact: true }),
    ).toBeVisible();
    await guest.getByRole("button", { name: "Leave group" }).click();
    await expect(guest).toHaveURL(/\/groups$/);

    await creator.reload();
    await expect(creator.getByRole("button", { name: /^Remove / })).toHaveCount(
      0,
    );
  });

  test("an admin removes a member, who then loses access", async ({
    browser,
  }) => {
    const { creator, guest } = await groupWithGuest(
      browser,
      `E2E remove ${Date.now()}`,
    );
    const groupUrl = guest.url();

    await creator.getByRole("button", { name: /^Remove / }).click();
    await expect(creator.getByRole("status")).toContainText("was removed.");
    await expect(creator.getByRole("alertdialog")).toHaveCount(0);

    const response = await guest.goto(groupUrl);
    expect(response?.status()).toBe(404);
  });

  test("the only admin cannot leave", async ({ browser }) => {
    const creator = await signedInPage(browser, "member@example.com");
    await createGroup(creator, `E2E last admin ${Date.now()}`);
    await creator.getByRole("button", { name: "Leave group" }).click();
    await expect(creator.getByRole("main").getByRole("alert")).toContainText(
      "You are the only admin. Promote another member before you leave.",
    );
    await expect(creator).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  });

  test("an admin adds, renames and archives a category, and a member does not see the controls", async ({
    browser,
  }) => {
    const { creator, guest } = await groupWithGuest(
      browser,
      `E2E categories ${Date.now()}`,
    );
    const name = `Pets ${Date.now()}`;

    await creator.getByLabel("New category").fill(name);
    await creator.getByRole("button", { name: "Add category" }).click();
    const nameField = creator.getByLabel(`Name of ${name}`);
    await expect(nameField).toBeVisible();

    await nameField.fill(`${name} and vet`);
    await creator.getByRole("button", { name: `Save ${name}` }).click();
    await expect(creator.getByLabel(`Name of ${name} and vet`)).toBeVisible();

    await creator
      .getByRole("button", { name: `Archive ${name} and vet` })
      .click();
    await expect(creator.getByText("Archived")).toBeVisible();

    await guest.reload();
    await expect(
      guest.getByRole("heading", { name: "Categories", exact: true }),
    ).toHaveCount(0);
    await expect(guest.getByRole("button", { name: /^Remove / })).toHaveCount(
      0,
    );
  });
});

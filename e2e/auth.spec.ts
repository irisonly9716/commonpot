import { expect, test } from "@playwright/test";

const memberEmail = "member@example.com";
const memberPassword = "password123";

test.describe("US1 sign in safely", () => {
  test("sends a signed-out visitor to sign-in and back to the page they wanted", async ({
    page,
  }) => {
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fgroups$/);

    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/groups$/);
    await expect(
      page.getByRole("heading", { name: "Your groups" }),
    ).toBeVisible();
  });

  test("shows the same error for a wrong password and an unknown email", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const wrongPassword = await page
      .locator("form")
      .getByRole("alert")
      .innerText();

    await page.getByLabel("Email").fill("nobody-here@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(
      wrongPassword,
    );

    expect(wrongPassword).toBe("Email or password is incorrect.");
  });

  test("ignores an unsafe next value after signing in", async ({ page }) => {
    await page.goto("/sign-in?next=https%3A%2F%2Fevil.example%2Fphish");
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/groups$/);
  });

  test("signs out and protects the page again", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/groups$/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    await page.goto("/groups");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fgroups$/);
  });

  test("signs up a new user who lands on their groups", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Display name").fill("E2E Tester");
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("a-long-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/groups$/);
  });

  test("returns 401 from the API when signed out and 200 when signed in", async ({
    page,
  }) => {
    const signedOut = await page.request.get("/api/v1/me");
    expect(signedOut.status()).toBe(401);

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(memberEmail);
    await page.getByLabel("Password").fill(memberPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/groups$/);

    const signedIn = await page.request.get("/api/v1/me");
    expect(signedIn.status()).toBe(200);
  });
});

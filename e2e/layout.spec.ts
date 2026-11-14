import { expect, test } from "@playwright/test";

test.describe("page layout", () => {
  test("gives the sign-in and sign-up forms a usable width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/sign-in", "/sign-up"]) {
      await page.goto(path);
      const box = await page.locator("form").boundingBox();
      expect(box?.width ?? 0, `${path} form width`).toBeGreaterThan(280);
    }
  });

  test("gives the groups page a usable width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/sign-in?next=%2Fgroups");
    await page.getByLabel("Email").fill("member@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/groups$/);
    const box = await page.getByRole("main").boundingBox();
    expect(box?.width ?? 0, "groups main width").toBeGreaterThan(280);
  });
});

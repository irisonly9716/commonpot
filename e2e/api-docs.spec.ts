import { expect, test } from "@playwright/test";

test.describe("US13 connect other tools: Swagger UI", () => {
  test("shows the API documentation at /api/docs without signing in", async ({
    page,
  }) => {
    await page.goto("/api/docs");
    await expect(page).toHaveURL(/\/api\/docs$/);
    await expect(
      page.getByRole("heading", { name: /CommonPot API/ }),
    ).toBeVisible();
    await expect(page.getByText("Sign in and get a token")).toBeVisible();
  });
});

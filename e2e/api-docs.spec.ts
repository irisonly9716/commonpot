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

  test("lets someone open an endpoint, see its example and try it out", async ({
    page,
  }) => {
    await page.goto("/api/docs");
    await page.getByText("Sign in and get a token").click();
    await expect(
      page.getByRole("button", { name: "Try it out" }),
    ).toBeVisible();
    // The request body example is built from the schema, so it names the fields.
    await expect(
      page
        .locator(".opblock-body")
        .getByText(/"email"/)
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Authorize/ })).toBeVisible();
  });
});

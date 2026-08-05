import { expect, test } from "@playwright/test";

test.describe("public pages smoke", () => {
  test("homepage loads with hero heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("login page shows email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByPlaceholder(/^password$/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });
});

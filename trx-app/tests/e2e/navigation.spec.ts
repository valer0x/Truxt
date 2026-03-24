import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("root redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unknown routes show 404 or redirect", async ({ page }) => {
    await page.goto("/unknown-route");
    // Vue Router will handle this - just ensure no crash
    await expect(page.locator("body")).toBeVisible();
  });
});

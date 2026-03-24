import { test, expect } from "@playwright/test";

test.describe("Authentication and Routing", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.sessionStorage.clear();
      window.localStorage.clear();
    });
  });

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders connect wallet button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=TRX")).toBeVisible();
  });

  test("authenticated user on /login is redirected to /dashboard", async ({ page }) => {
    // Seed session
    await page.goto("/login");
    await page.evaluate(() => {
      window.sessionStorage.setItem(
        "trx_session",
        JSON.stringify({
          walletAddress: "0xtest123",
          did: "did:iota:test123",
          role: "SHIPPER",
          companyName: "Test Corp",
          country: "Italy",
          city: "Rome",
        })
      );
    });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("authenticated shipper sees dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      window.sessionStorage.setItem(
        "trx_session",
        JSON.stringify({
          walletAddress: "0xtest123",
          did: "did:iota:test123",
          role: "SHIPPER",
          companyName: "Test Corp",
          country: "Italy",
          city: "Rome",
        })
      );
    });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("authenticated carrier sees dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      window.sessionStorage.setItem(
        "trx_session",
        JSON.stringify({
          walletAddress: "0xcarrier1",
          did: "did:iota:carrier1",
          role: "CARRIER",
          companyName: "Carrier Corp",
          country: "Italy",
          city: "Milan",
        })
      );
    });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

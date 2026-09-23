import { expect, test } from "@playwright/test";

// These specs exercise the app without the LLM so they run anywhere.

test("landing page renders the brand and hero", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/NEXT Africa/);
  await expect(page.getByRole("button", { name: /get started/i }).first()).toBeVisible();
  await expect(page.getByText(/One message is all it takes/i)).toBeVisible();
});

test("get started opens the auth screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).first().click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("a new visitor can sign up and land on Today", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;
  await page.goto("/");
  await page.getByRole("button", { name: /get started/i }).first().click();
  await page.getByPlaceholder("What should we call you?").fill("E2E Tester");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("password123");
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("button", { name: /today/i }).first()).toBeVisible();
});

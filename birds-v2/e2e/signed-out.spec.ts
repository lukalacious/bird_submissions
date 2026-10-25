import { expect, test } from "@playwright/test";

test("signed-out visitors land on sign-in and keep where they were going", async ({ page }) => {
  await page.goto("/twitch");
  await expect(page).toHaveURL(/\/signin\?next=%2Ftwitch$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("the app can be installed without signing in", async ({ request }) => {
  for (const path of ["/manifest.webmanifest", "/icon", "/sw.js", "/offline"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

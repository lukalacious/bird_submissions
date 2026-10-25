import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/player.json" });

test("Today shows this month's tally", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: /^0 of \d+ birds twitched this month$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Twitch your first bird/ })).toBeVisible();
});

test("twitch a bird, see the joker preview, then remove it", async ({ page }) => {
  await page.goto("/twitch");
  await page.getByLabel("Find a bird").fill("kingfisher");
  const results = page.getByRole("region", { name: "Search results" }).getByRole("button");
  await results.first().click();
  await expect(page.getByText("1 bird ready")).toBeVisible();

  await page.getByRole("button", { name: /^Add to / }).click();
  await expect(page.getByRole("status")).toHaveText(/^1 bird added/);

  // the bird is now on this month's list, and can be taken off again
  await page.getByLabel("Find a bird").fill("");
  const remove = page.getByRole("button", { name: /^Remove / }).first();
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.getByRole("status")).toHaveText("Removed.");
});

test("a species can't be added twice in a season", async ({ page }) => {
  await page.goto("/twitch");
  await page.getByLabel("Find a bird").fill("hamerkop");
  await page.getByRole("region", { name: "Search results" }).getByRole("button").first().click();
  await page.getByRole("button", { name: /^Add to / }).click();
  await expect(page.getByRole("status")).toHaveText(/^1 bird added/);

  await page.getByLabel("Find a bird").fill("hamerkop");
  await expect(page.getByRole("region", { name: "Search results" }).getByRole("button").first()).toBeDisabled();
  await expect(page.getByText(/^Twitched in /).first()).toBeVisible();
});

test("Flock tabs load one section at a time", async ({ page }) => {
  await page.goto("/flock?tab=leaderboard");
  await expect(page.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("link", { name: "Photos" }).click();
  await expect(page).toHaveURL(/tab=photos/);
});

for (const path of ["/", "/twitch", "/flock", "/me", "/me/birds", "/check-in"]) {
  test(`no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });
}

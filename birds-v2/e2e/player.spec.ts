import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/player.json" });

test("Today shows this month's tally", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: /^0 of \d+ birds twitched this month$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Twitch your first bird/ })).toBeVisible();
  // a brand-new player is told their first month is free, and can read the rules
  await expect(page.getByText(/first month doesn't count/)).toBeVisible();
  await page.getByRole("link", { name: "How the game works" }).click();
  await expect(page.getByRole("heading", { name: "Staying in" })).toBeVisible();
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

test("a player can set a display name and home region, and download their birds", async ({ page }) => {
  await page.goto("/me");
  await page.getByLabel("Display name (optional)").fill("no spaces allowed");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText(/letters, numbers, hyphens and underscores, with no spaces/)).toBeVisible();

  const handle = `e2e_${Date.now()}`;
  await page.getByLabel("Display name (optional)").fill(handle);
  await page.getByLabel("Home region").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Display name (optional)")).toHaveValue(handle);

  const csv = await page.request.get("/me/export");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("year,month,bird,scientific name,family");
});

test("Sightings tabs load one section at a time", async ({ page }) => {
  await page.goto("/sightings?tab=table");
  await expect(page.getByRole("link", { name: "Table" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("link", { name: "Photos" }).click();
  await expect(page).toHaveURL(/tab=photos/);
});

test("Species lists what the club has seen and who saw it", async ({ page }) => {
  await page.goto("/sightings?tab=species");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(page.getByLabel("Find a bird, family or player")).toBeVisible();
  await page.getByRole("link", { name: "Whole season" }).click();
  await expect(page).toHaveURL(/m=\d{4}(&|$)/);
});

test("old Flock links still work", async ({ page }) => {
  await page.goto("/flock");
  await expect(page).toHaveURL(/\/sightings$/);
});

for (const path of ["/", "/rules", "/twitch", "/sightings", "/sightings?tab=species", "/sightings?tab=jokers", "/me", "/me/birds", "/check-in"]) {
  test(`no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });
}

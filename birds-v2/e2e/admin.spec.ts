import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

const playerEmail = () => readFileSync("e2e/.auth/email.txt", "utf8").trim().split("\n")[0];

test("Standing shows the month-end forecast for everyone", async ({ page }) => {
  await page.goto("/admin/standing");
  await expect(page.getByText(/What month-end would do/)).toBeVisible();
  await expect(page.getByRole("link", { name: /^Everyone \(\d+\)$/ })).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: /^Out \(\d+\)$/ }).click();
  await expect(page).toHaveURL(/show=out/);
});

test("adjust a player's jokers, undo it, and see both in the log", async ({ page }) => {
  await page.goto("/admin/players");
  await page.getByRole("row", { name: new RegExp(playerEmail()) }).getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Adjust jokers" })).toBeVisible();

  await page.getByLabel("Jokers (+ or −)").fill("1.5");
  await page.getByLabel("Reason").fill("e2e correction");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("status")).toHaveText(/^Added 1.5 for /);
  await expect(page.getByText("1.5 left")).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("status")).toHaveText("Adjustment removed.");

  await page.goto("/admin");
  await expect(page.getByText("Removed a joker adjustment").first()).toBeVisible();
});

test("Months shows the whole season's caps at a glance", async ({ page }) => {
  await page.goto("/admin/months?m=2027-04");
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(13);
  // April has 30 days, and the selected month is marked
  await expect(table.getByRole("row", { name: /^April/ }).getByRole("cell").first()).toHaveText("30");
  await expect(table.getByRole("link", { name: "April" })).toHaveAttribute("aria-current", "true");
  await table.getByRole("link", { name: "June" }).click();
  await expect(page).toHaveURL(/m=2027-06/);
});

test("put a player out by hand and bring them back", async ({ page }) => {
  await page.goto("/admin/players");
  await page.getByRole("row", { name: new RegExp(playerEmail()) }).getByRole("link").click();
  await page.getByText("Eliminate by hand…").click();
  await page.getByRole("button", { name: /^Yes, .* is out$/ }).click();
  await expect(page.getByRole("status")).toHaveText(/is out of the \d{4} season/);
  await page.getByRole("button", { name: /^Reinstate / }).click();
  await expect(page.getByRole("status")).toHaveText(/is back in/);
});

test("removing a player needs their email typed", async ({ page }) => {
  await page.goto("/admin/players");
  await page.getByRole("row", { name: new RegExp(playerEmail()) }).getByRole("link").click();
  await page.getByText(/^Remove .*…$/).click();
  await page.getByLabel(/^Type .* to confirm$/).fill("wrong@example.test");
  await page.getByRole("button", { name: "Delete this player for good" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Not done" })).toHaveText(/doesn't match this player. Nothing was removed/);
});

for (const path of ["/admin", "/admin/standing", "/admin/players", "/admin/changes", "/admin/months"]) {
  test(`no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([]);
  });
}

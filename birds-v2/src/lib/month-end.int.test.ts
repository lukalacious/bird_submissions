/**
 * closeMonth against v2-staging (npm run test:int), in a far-future month
 * with a threshold of 3 so the fixtures stay small.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));

const { db } = await import("./db");
const { closeMonth } = await import("./month-end");

const YEAR = 2099;
const JUNE = { year: YEAR, month: 6 };
const tag = `monthend-test-${Date.now()}`;
const ids: Record<"safe" | "covered" | "empty" | "fresh", string> = { safe: "", covered: "", empty: "", fresh: "" };

beforeAll(async () => {
  await db.monthlySettings.create({ data: { ...JUNE, maxBirdsPerPeriod: 31, eliminationThreshold: 3 } });
  const birds = await db.bird.findMany({ distinct: ["speciesId"], take: 4, select: { id: true, speciesId: true, regionId: true } });
  for (const key of Object.keys(ids) as (keyof typeof ids)[]) {
    const email = `${tag}-${key}@example.test`;
    ids[key] = (await db.user.create({ data: { email, emailNormalized: email, identityCheckedAt: new Date() } })).id;
  }
  const sub = (userId: string, i: number, month: number) => ({ userId, birdId: birds[i].id, speciesId: birds[i].speciesId, regionId: birds[i].regionId, year: YEAR, month });

  for (const key of ["safe", "covered", "empty"] as const) {
    await db.userChallengeStatus.create({ data: { userId: ids[key], year: YEAR, joinedMonth: 1 } });
  }
  await db.submission.createMany({ data: [sub(ids.safe, 0, 6), sub(ids.safe, 1, 6), sub(ids.safe, 2, 6), sub(ids.covered, 3, 6), sub(ids.empty, 0, 3)] });
  // covered: short by 2, holding 1.5 (Jan) + 0.5 (Feb) — only works with pooling
  await db.userJoker.createMany({
    data: [
      { userId: ids.covered, year: YEAR, month: 1, totalJokers: 1.5 },
      { userId: ids.covered, year: YEAR, month: 2, totalJokers: 0.5 },
      { userId: ids.empty, year: YEAR, month: 1, totalJokers: 50 },
    ],
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: tag } } });
  await db.userChallengeStatus.deleteMany({ where: { year: YEAR } });
  await db.cronRun.deleteMany({ where: { year: YEAR } });
  await db.monthlySettings.deleteMany({ where: { year: YEAR } });
});

describe("closeMonth", () => {
  it("covers, eliminates and registers newcomers in one pass", async () => {
    const summary = await closeMonth(JUNE);
    expect(summary).not.toBeNull();

    expect(summary!.covered).toContainEqual({ userId: ids.covered, jokers: 2 });
    const spends = await db.jokerSpend.findMany({ where: { userId: ids.covered }, orderBy: { fromMonth: "asc" } });
    expect(spends.map((s) => [s.fromMonth, s.amount])).toEqual([
      [1, 1.5],
      [2, 0.5],
    ]);
    const used = await db.userJoker.findMany({ where: { userId: ids.covered }, orderBy: { month: "asc" } });
    expect(used.map((u) => u.usedJokers)).toEqual([1.5, 0.5]);

    // three empty months in a row (4, 5, 6) beats 50 jokers when the limit is 2
    expect(summary!.eliminated).toContainEqual({ userId: ids.empty, reason: "empty-months" });
    const status = await db.userChallengeStatus.findUniqueOrThrow({ where: { userId_year: { userId: ids.empty, year: YEAR } } });
    expect(status).toMatchObject({ isEliminated: true, eliminationMonth: 6 });

    expect(summary!.eliminated.map((e) => e.userId)).not.toContain(ids.safe);
    const fresh = await db.userChallengeStatus.findUniqueOrThrow({ where: { userId_year: { userId: ids.fresh, year: YEAR } } });
    expect(fresh.joinedMonth).toBe(6);
  }, 60_000);

  it("never closes the same month twice", async () => {
    expect(await closeMonth(JUNE)).toBeNull();
    expect(await db.jokerSpend.count({ where: { userId: ids.covered } })).toBe(2);
  }, 60_000);
});

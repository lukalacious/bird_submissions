/**
 * Integration test against the v2-staging database (npm run test:int).
 * Creates two throwaway players, merges them, checks every rule, cleans up.
 */
import "dotenv/config";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { db } = await import("./db");
const { executeMerge, previewMerge } = await import("./merge-users");

const tag = `merge-test-${Date.now()}`;
const created: string[] = [];

async function makeUser(label: string) {
  const email = `${tag}-${label}@example.test`;
  const u = await db.user.create({ data: { email, emailNormalized: email, name: `Test ${label}`, identityCheckedAt: new Date() } });
  created.push(u.id);
  return u;
}

afterAll(async () => {
  await db.mergeEvent.deleteMany({ where: { fromEmail: { startsWith: tag } } });
  await db.user.deleteMany({ where: { id: { in: created } } });
});

describe("executeMerge", () => {
  it("moves a duplicate account's season into the real player", async () => {
    const birds = await db.bird.findMany({
      where: { species: { groupId: { not: null } } },
      take: 3,
      select: { id: true, speciesId: true, regionId: true },
    });
    const [b1, b2, b3] = birds;
    const source = await makeUser("source");
    const target = await makeUser("target");
    const sub = (userId: string, b: (typeof birds)[number], month: number) => ({
      userId, birdId: b.id, speciesId: b.speciesId, regionId: b.regionId, year: 2099, month,
    });

    await db.submission.createMany({
      data: [sub(target.id, b1, 3), sub(source.id, b1, 5), sub(source.id, b2, 5), sub(source.id, b3, 5)],
    });
    await db.monthlyCheckIn.createMany({
      data: [
        { userId: source.id, year: 2099, month: 5, liferCount: 4 },
        { userId: target.id, year: 2099, month: 5, liferCount: 1 },
      ],
    });
    await db.userJoker.createMany({
      data: [
        { userId: source.id, year: 2099, month: 5, bonusJokers: 3, totalJokers: 3, usedJokers: 1 },
        { userId: target.id, year: 2099, month: 5, bonusJokers: 2, totalJokers: 2, usedJokers: 0 },
      ],
    });

    const preview = await previewMerge(source.id, target.id);
    expect(preview.plan.moveSubmissionIds).toHaveLength(2);
    expect(preview.plan.dropSubmissions).toHaveLength(1);

    await executeMerge(source.id, target.id, target.id);

    expect(await db.user.findUnique({ where: { id: source.id } })).toBeNull();
    const subs = await db.submission.findMany({ where: { userId: target.id }, orderBy: { month: "asc" } });
    expect(subs.map((s) => [s.birdId, s.month])).toEqual([
      [b1.id, 3],
      [b2.id, 5],
      [b3.id, 5],
    ]);

    // target's check-in wins; larger bonus kept; spends added
    const checkIn = await db.monthlyCheckIn.findMany({ where: { userId: target.id } });
    expect(checkIn.map((c) => c.liferCount)).toEqual([1]);
    const joker = await db.userJoker.findUniqueOrThrow({
      where: { userId_year_month: { userId: target.id, year: 2099, month: 5 } },
    });
    expect(joker.bonusJokers).toBe(3);
    expect(joker.usedJokers).toBe(1);
    expect(joker.totalJokers).toBe(joker.jokers + 3);

    const event = await db.mergeEvent.findFirstOrThrow({ where: { fromUserId: source.id } });
    expect(event.toUserId).toBe(target.id);
  }, 60_000);
});

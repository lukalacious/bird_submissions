/**
 * saveCheckIn against v2-staging (npm run test:int). The open check-in month
 * is pinned to a far-future test month so the test never depends on today.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const MONTH = { year: 2099, month: 5 };
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("@/lib/challenge-time", async (original) => ({
  ...(await original<typeof import("@/lib/challenge-time")>()),
  openCheckInMonth: () => MONTH,
}));
const player = { id: "" };
vi.mock("@/lib/dal", () => ({ requirePlayer: async () => player }));

const { db } = await import("@/lib/db");
const { saveCheckIn } = await import("./actions");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const answers = {
  within15km: "yes",
  beyond750km: "no",
  nonMotorisedCount: "0",
  liferCount: "1",
};

beforeAll(async () => {
  const email = `checkin-test-${Date.now()}@example.test`;
  const user = await db.user.create({ data: { email, emailNormalized: email, identityCheckedAt: new Date() } });
  player.id = user.id;
  const bird = await db.bird.findFirstOrThrow({ select: { id: true, speciesId: true, regionId: true } });
  const sub = await db.submission.create({ data: { userId: user.id, ...MONTH, ...bird, birdId: bird.id } });
  // existing group jokers must survive; a golden bird proven by photo counts on top
  await db.userJoker.create({ data: { userId: user.id, ...MONTH, jokers: 1.5, totalJokers: 1.5 } });
  await db.specialBird.create({ data: { ...MONTH, kind: "GOLDEN", speciesId: bird.speciesId } });
  await db.photo.create({ data: { submissionId: sub.id, userId: user.id, url: "https://x.public.blob.vercel-storage.com/p.jpg", ...MONTH } });
});

afterAll(async () => {
  await db.user.delete({ where: { id: player.id } });
  await db.specialBird.deleteMany({ where: MONTH });
});

describe("saveCheckIn", () => {
  it("adds the check-in bonus and photo-proven golden birds on top of group jokers", async () => {
    const result = await saveCheckIn(null, form(answers));
    // 5 (15km) + 1 lifer + 1 golden bird with a photo
    expect(result).toEqual({ ok: true, message: "Saved. Your bonus for the month is 7 jokers." });
    const joker = await db.userJoker.findUniqueOrThrow({ where: { userId_year_month: { userId: player.id, ...MONTH } } });
    expect(joker).toMatchObject({ jokers: 1.5, bonusJokers: 7, totalJokers: 8.5 });
  }, 30_000);

  it("updates in place when answered again", async () => {
    await saveCheckIn(null, form({ ...answers, within15km: "no" }));
    expect(await db.monthlyCheckIn.count({ where: { userId: player.id } })).toBe(1);
    const joker = await db.userJoker.findUniqueOrThrow({ where: { userId_year_month: { userId: player.id, ...MONTH } } });
    expect(joker.bonusJokers).toBe(2); // 1 lifer + 1 golden
  }, 30_000);

  it("rejects more non-motorised birds than the player has", async () => {
    const result = await saveCheckIn(null, form({ ...answers, nonMotorisedCount: "5" }));
    expect(result).toEqual({ ok: false, error: "You have 1 bird this month, so non-motorised can't be more than that." });
  }, 30_000);
});

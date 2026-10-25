/**
 * Photos are golden-bird proof only (npm run test:int, v2-staging).
 * The open-month lookup is pinned to a far-future month.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const MONTH = { year: 2099, month: 7 };
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
const player = { id: "", role: "USER", username: null };
vi.mock("@/lib/dal", () => ({ requirePlayer: async () => player }));
let goldenSpecies = "";
vi.mock("@/lib/checklist", () => ({
  goldenPhotoMonthFor: async (speciesId: string | null) => (speciesId === goldenSpecies ? MONTH : null),
}));

const { db } = await import("@/lib/db");
const { attachPhoto, removePhoto } = await import("./photo-actions");

const host = "https://abc.public.blob.vercel-storage.com";
let golden = { id: "" };
let plain = { id: "" };

beforeAll(async () => {
  const email = `photo-test-${Date.now()}@example.test`;
  player.id = (await db.user.create({ data: { email, emailNormalized: email, identityCheckedAt: new Date() } })).id;
  const birds = await db.bird.findMany({ distinct: ["speciesId"], take: 2, select: { id: true, speciesId: true, regionId: true } });
  goldenSpecies = birds[0].speciesId;
  await db.specialBird.create({ data: { ...MONTH, kind: "GOLDEN", speciesId: goldenSpecies } });
  [golden, plain] = await Promise.all(
    birds.map((b) => db.submission.create({ data: { userId: player.id, birdId: b.id, speciesId: b.speciesId, regionId: b.regionId, ...MONTH } }))
  );
});

afterAll(async () => {
  await db.user.delete({ where: { id: player.id } });
  await db.specialBird.deleteMany({ where: MONTH });
});

const bonus = async () =>
  (await db.userJoker.findUnique({ where: { userId_year_month: { userId: player.id, ...MONTH } } }))?.bonusJokers ?? 0;

describe("golden-bird proof photos", () => {
  it("refuses a photo on a bird that isn't golden", async () => {
    const r = await attachPhoto({ submissionId: plain.id, url: `${host}/photos/${player.id}/${plain.id}-x.jpg` });
    expect(r).toEqual({ ok: false, error: "Photos are for this month's golden birds only." });
  }, 30_000);

  it("refuses a URL from someone else's folder", async () => {
    const r = await attachPhoto({ submissionId: golden.id, url: `${host}/photos/someone-else/${golden.id}-x.jpg` });
    expect(r.ok).toBe(false);
  }, 30_000);

  it("a photo proves the golden bird: +1 joker, removed again with the photo", async () => {
    const r = await attachPhoto({ submissionId: golden.id, url: `${host}/photos/${player.id}/${golden.id}-x.jpg` });
    expect(r).toEqual({ ok: true, message: "Golden bird proven. Your bonus this month is 1 joker." });
    expect(await bonus()).toBe(1);
    await removePhoto({ submissionId: golden.id });
    expect(await bonus()).toBe(0);
  }, 30_000);
});

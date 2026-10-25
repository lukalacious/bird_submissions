/**
 * Admin flows that change game data, against v2-staging (npm run test:int):
 * change requests (swap / remove) and photo review awards.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
const admin = { id: "" };
vi.mock("@/lib/dal", () => ({ requireAdmin: async () => admin }));

const { db } = await import("./db");
const { applyChangeRequest } = await import("./change-requests");
const { reviewPhoto } = await import("@/app/admin/photos/actions");

const MONTH = { year: 2099, month: 3 };
const email = `changes-test-${Date.now()}@example.test`;
let userId = "";
let birds: { id: string; speciesId: string; regionId: string }[] = [];

beforeAll(async () => {
  const user = await db.user.create({ data: { email, emailNormalized: email, identityCheckedAt: new Date() } });
  userId = admin.id = user.id;
  const region = await db.region.findFirstOrThrow();
  birds = await db.bird.findMany({ where: { regionId: region.id }, distinct: ["speciesId"], take: 3, select: { id: true, speciesId: true, regionId: true } });
  await db.submission.createMany({
    data: birds.slice(0, 2).map((b) => ({ userId, birdId: b.id, speciesId: b.speciesId, regionId: b.regionId, ...MONTH })),
  });
});

afterAll(async () => {
  await db.user.delete({ where: { id: userId } });
});

const request = async (type: "SWAP" | "DELETE", submissionId: string, replacementBirdId?: string) =>
  (await db.changeRequest.create({ data: { userId, type, ...MONTH, submissionId, replacementBirdId } })).id;

describe("applyChangeRequest", () => {
  it("swaps a bird for another from the same region", async () => {
    const sub = await db.submission.findFirstOrThrow({ where: { userId, birdId: birds[0].id } });
    expect(await applyChangeRequest(await request("SWAP", sub.id, birds[2].id), admin.id)).toBeNull();
    expect(await db.submission.findUniqueOrThrow({ where: { id: sub.id } })).toMatchObject({ birdId: birds[2].id, speciesId: birds[2].speciesId });
  }, 30_000);

  it("refuses a swap to a species the player already has", async () => {
    const sub = await db.submission.findFirstOrThrow({ where: { userId, birdId: birds[2].id } });
    const id = await request("SWAP", sub.id, birds[1].id);
    expect(await applyChangeRequest(id, admin.id)).toBe("The player already has that species this season.");
    expect((await db.changeRequest.findUniqueOrThrow({ where: { id } })).status).toBe("PENDING");
  }, 30_000);

  it("removes a bird", async () => {
    const sub = await db.submission.findFirstOrThrow({ where: { userId, birdId: birds[1].id } });
    expect(await applyChangeRequest(await request("DELETE", sub.id), admin.id)).toBeNull();
    expect(await db.submission.count({ where: { userId } })).toBe(1);
  }, 30_000);
});

describe("reviewPhoto", () => {
  it("an approved award lands in the month's bonus jokers", async () => {
    const sub = await db.submission.findFirstOrThrow({ where: { userId } });
    const photo = await db.photo.create({
      data: { submissionId: sub.id, userId, url: "https://x.public.blob.vercel-storage.com/p.jpg", ...MONTH },
    });
    const form = new FormData();
    form.set("photoId", photo.id);
    form.set("decision", "approve");
    form.set("award", "1.5");
    await reviewPhoto(form);
    const joker = await db.userJoker.findUniqueOrThrow({ where: { userId_year_month: { userId, ...MONTH } } });
    expect(joker.bonusJokers).toBe(1.5);
    expect(joker.bonusBreakdown).toEqual([{ rule: expect.stringMatching(/^Photo award: /), value: 1.5 }]);
  }, 30_000);
});

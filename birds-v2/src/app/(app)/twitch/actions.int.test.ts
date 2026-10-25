/**
 * Integration test for the checklist Server Actions against v2-staging
 * (npm run test:int). The session and cache invalidation are stubbed; the
 * rules, transaction, advisory lock and joker recalculation are real.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
const player = { id: "", role: "USER", username: null };
vi.mock("@/lib/dal", () => ({ requirePlayer: async () => player }));

const { db } = await import("@/lib/db");
const { submitBirds, removeBird } = await import("./actions");

let regionId = "";
let groupBirds: { id: string; speciesId: string }[] = [];

beforeAll(async () => {
  const email = `checklist-test-${Date.now()}@example.test`;
  const user = await db.user.create({ data: { email, emailNormalized: email, identityCheckedAt: new Date() } });
  player.id = user.id;

  // Three birds of one group in one region → exactly 1 group joker
  const group = await db.group.findFirstOrThrow({
    where: { species: { some: {} } },
    orderBy: { species: { _count: "desc" } },
  });
  const region = await db.region.findFirstOrThrow({
    where: { birds: { some: { species: { groupId: group.id } } } },
  });
  regionId = region.id;
  groupBirds = await db.bird.findMany({
    where: { regionId, species: { groupId: group.id } },
    distinct: ["speciesId"],
    take: 3,
    select: { id: true, speciesId: true },
  });
});

afterAll(async () => {
  await db.user.delete({ where: { id: player.id } });
});

describe("submitBirds", () => {
  it("adds birds and reports the group joker they earn", async () => {
    const result = await submitBirds({
      regionId,
      target: "current",
      birdIds: groupBirds.map((b) => b.id),
      liferBirdIds: [groupBirds[0].id],
      customNames: [],
    });
    expect(result).toEqual({ ok: true, message: "3 birds added. +1 joker for next month." });

    const subs = await db.submission.findMany({ where: { userId: player.id } });
    expect(subs).toHaveLength(3);
    expect(subs.filter((s) => s.isLifer)).toHaveLength(1);
    const joker = await db.userJoker.findFirstOrThrow({ where: { userId: player.id } });
    expect(joker.jokers).toBe(1);
  }, 30_000);

  it("refuses a species already twitched this season", async () => {
    const result = await submitBirds({
      regionId,
      target: "current",
      birdIds: [groupBirds[1].id],
      liferBirdIds: [],
      customNames: [],
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/^Already twitched this season/);
  }, 30_000);

  it("removes a bird and recalculates jokers", async () => {
    const sub = await db.submission.findFirstOrThrow({ where: { userId: player.id } });
    expect(await removeBird({ submissionId: sub.id })).toEqual({ ok: true, message: "Removed." });
    const joker = await db.userJoker.findFirstOrThrow({ where: { userId: player.id } });
    expect(joker.jokers).toBe(0);
  }, 30_000);

  it("rejects malformed input without touching the database", async () => {
    const result = await submitBirds({ regionId, target: "current", birdIds: [], liferBirdIds: [], customNames: [] });
    expect(result).toEqual({ ok: false, error: "Add at least one bird first." });
  });
});

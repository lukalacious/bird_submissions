/**
 * Test-site mode (STAGING_SITE=1): an eliminated ADMIN may still twitch;
 * an eliminated player may not. Against v2-staging (npm run test:int).
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

process.env.STAGING_SITE = "1";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
const player = { id: "", role: "USER", username: null };
vi.mock("@/lib/dal", () => ({ requirePlayer: async () => player }));

const { db } = await import("@/lib/db");
const { getChallengeMonth } = await import("@/lib/challenge-time");
const { submitBirds } = await import("./actions");

const tag = `testmode-${Date.now()}`;
const ids: Record<"admin" | "user", string> = { admin: "", user: "" };
let bird = { id: "", regionId: "" };

beforeAll(async () => {
  const { year } = getChallengeMonth();
  bird = await db.bird.findFirstOrThrow({ select: { id: true, regionId: true } });
  for (const role of ["admin", "user"] as const) {
    const email = `${tag}-${role}@example.test`;
    const u = await db.user.create({
      data: { email, emailNormalized: email, role: role === "admin" ? "ADMIN" : "USER", identityCheckedAt: new Date() },
    });
    ids[role] = u.id;
    await db.userChallengeStatus.create({ data: { userId: u.id, year, isEliminated: true, eliminationMonth: 4 } });
  }
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { startsWith: tag } } });
  delete process.env.STAGING_SITE; // process-wide: don't leak into other test files
});

const add = () => submitBirds({ regionId: bird.regionId, target: "current", birdIds: [bird.id], liferBirdIds: [], customNames: [] });

describe("test-site mode", () => {
  it("lets an eliminated admin twitch", async () => {
    Object.assign(player, { id: ids.admin, role: "ADMIN" });
    expect(await add()).toMatchObject({ ok: true });
  }, 30_000);

  it("still blocks an eliminated player", async () => {
    Object.assign(player, { id: ids.user, role: "USER" });
    expect(await add()).toEqual({ ok: false, error: "You're out of this season's challenge." });
  }, 30_000);
});

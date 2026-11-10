/**
 * Admin hand-edits against v2-staging (npm run test:int): joker adjustments
 * survive a bonus rebuild, eliminate / reinstate, roles, and removal.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));

const { db } = await import("./db");
const { recalculateBonusJokers } = await import("./bonus-db");
const { addJokerAdjustment, removeJokerAdjustment, eliminatePlayer, reinstatePlayer, setRole, removePlayer } = await import("./admin-players");
const { getStandings } = await import("./standing");

const MONTH = { year: 2098, month: 4 };
const stamp = Date.now();
const email = `admin-edit-${stamp}@example.test`;
const adminEmail = `admin-edit-admin-${stamp}@example.test`;
let userId = "";
let adminId = "";

const row = () => db.userJoker.findUnique({ where: { userId_year_month: { userId, ...MONTH } } });

beforeAll(async () => {
  userId = (await db.user.create({ data: { email, emailNormalized: email, identityCheckedAt: new Date() } })).id;
  adminId = (await db.user.create({ data: { email: adminEmail, emailNormalized: adminEmail, role: "ADMIN", identityCheckedAt: new Date() } })).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
});

describe("joker adjustments", () => {
  it("rejects zero, thirds and silly amounts, and a missing reason", async () => {
    for (const amount of [0, 0.3, 25, Number.NaN]) {
      expect(await addJokerAdjustment({ userId, month: MONTH, amount, reason: "test", adminId })).toMatch(/whole or half/);
    }
    expect(await addJokerAdjustment({ userId, month: MONTH, amount: 1, reason: " ", adminId })).toMatch(/Say why/);
    expect(await row()).toBeNull();
  });

  it("adds to the month's bonus, shows as its own line, and survives a rebuild", async () => {
    expect(await addJokerAdjustment({ userId, month: MONTH, amount: 1.5, reason: "missed lifer", adminId })).toBeNull();
    expect(await addJokerAdjustment({ userId, month: MONTH, amount: -0.5, reason: "double counted", adminId })).toBeNull();
    await db.monthlyCheckIn.create({ data: { userId, ...MONTH, within15km: true } });
    await recalculateBonusJokers(db, userId, MONTH); // what a check-in save or photo review does

    const r = await row();
    expect(r?.bonusJokers).toBe(6); // +5 within 15 km, +1.5, −0.5
    expect(r?.totalJokers).toBe(6);
    expect(r?.bonusBreakdown).toEqual([
      { rule: "All within 15km", value: 5 },
      { rule: "Admin: missed lifer", value: 1.5 },
      { rule: "Admin: double counted", value: -0.5 },
    ]);
  });

  it("undoing one takes exactly that amount back off", async () => {
    const adj = await db.jokerAdjustment.findFirstOrThrow({ where: { userId, reason: "missed lifer" } });
    expect((await removeJokerAdjustment(adj.id)).error).toBeNull();
    expect((await row())?.bonusJokers).toBe(4.5);
    expect((await removeJokerAdjustment(adj.id)).error).toMatch(/already removed/);
  });
});

describe("eliminate and reinstate", () => {
  it("puts a player out by hand and brings them back", async () => {
    await eliminatePlayer(userId, MONTH);
    let { players } = await getStandings(MONTH, userId);
    expect(players[0].standing).toEqual({ kind: "out", eliminationMonth: 4 });

    expect(await reinstatePlayer(userId, MONTH.year)).toBeNull();
    ({ players } = await getStandings(MONTH, userId));
    // a player with no record before the ruling is back to "first month", not judged from January
    expect(players[0].standing).toEqual({ kind: "exempt" });
    expect(await reinstatePlayer(userId, MONTH.year)).toMatch(/isn't out/);
  });
});

describe("roles and removal", () => {
  it("an admin can't demote or remove themselves", async () => {
    expect(await setRole(adminId, "USER", adminId)).toMatch(/your own role/);
    expect(await removePlayer(adminId, adminEmail, adminId)).toMatch(/can't remove yourself/);
  });

  it("promotes and demotes another player", async () => {
    expect(await setRole(userId, "ADMIN", adminId)).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).role).toBe("ADMIN");
    expect(await setRole(userId, "USER", adminId)).toBeNull();
  });

  it("removes a player only when their email is typed exactly, and takes their data with them", async () => {
    expect(await removePlayer(userId, "someone-else@example.test", adminId)).toMatch(/doesn't match/);
    expect(await db.user.findUnique({ where: { id: userId } })).not.toBeNull();

    expect(await removePlayer(userId, email.toUpperCase(), adminId)).toBeNull();
    expect(await db.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await db.jokerAdjustment.count({ where: { userId } })).toBe(0);
    expect(await db.userJoker.count({ where: { userId } })).toBe(0);
  });
});

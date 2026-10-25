import "server-only";
import { db } from "@/lib/db";
import { findLikelyDuplicates, type DuplicateMatch } from "@/lib/identity";

export interface PlayerMatch extends DuplicateMatch {
  name: string;
  maskedEmail: string;
  image: string | null;
}

/** "colin.jackson@arocha.org" → "c•••n@arocha.org" — enough to recognise, not to harvest. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}•••@${domain}`;
  return `${local[0]}•••${local.at(-1)}@${domain}`;
}

/** Existing players this user might be. Server-side source of truth for claims. */
export async function findMatchesFor(userId: string): Promise<PlayerMatch[]> {
  const [me, others] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { emailNormalized: true, name: true } }),
    db.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, emailNormalized: true, name: true, username: true, email: true, image: true },
    }),
  ]);

  const byId = new Map(others.map((o) => [o.id, o]));
  return findLikelyDuplicates(me, others).map((m) => {
    const p = byId.get(m.id)!;
    return { ...m, name: p.username ?? p.name ?? "Unnamed player", maskedEmail: maskEmail(p.email), image: p.image };
  });
}

/**
 * Runs once when a user is created. No likely duplicate → they're cleared to
 * play straight away; otherwise they're asked on /welcome.
 */
export async function runSignupIdentityCheck(userId: string) {
  const matches = await findMatchesFor(userId);
  if (matches.length === 0) {
    await db.user.update({ where: { id: userId }, data: { identityCheckedAt: new Date() } });
  }
}

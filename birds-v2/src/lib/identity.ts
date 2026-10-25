/**
 * Duplicate-account detection. v1 created a silent second player whenever
 * someone signed in with another Google account (Shaun, Colin, Dave Gear) and
 * fixed it later with one-off merge scripts. v2 asks "Are you already playing
 * as X?" on first sign-in, using these matchers. Pure — no DB.
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Canonical mailbox for comparison: lowercased, +tag stripped, and for Gmail
 * dots removed (steve.spark60@ and stevespark60@ are one inbox).
 * Used for detection only — never as the login identity.
 */
export function normalizeEmail(email: string): string {
  const [rawLocal, rawDomain = ""] = email.trim().toLowerCase().split("@");
  let local = rawLocal.split("+")[0];
  let domain = rawDomain;
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replaceAll(".", "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

function nameTokens(name: string | null | undefined): string[] {
  return (name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z]+/)
    .filter((t) => t.length > 1);
}

export interface PlayerIdentity {
  id: string;
  emailNormalized: string;
  name: string | null;
}

export type MatchStrength = "strong" | "likely";

export interface DuplicateMatch {
  id: string;
  strength: MatchStrength;
  reason: string;
}

/** Existing players the newcomer might be, strongest first. */
export function findLikelyDuplicates(
  newcomer: Omit<PlayerIdentity, "id">,
  players: PlayerIdentity[]
): DuplicateMatch[] {
  const newTokens = nameTokens(newcomer.name);
  const newFull = newTokens.join(" ");
  const newLocal = newcomer.emailNormalized.split("@")[0];
  const matches: DuplicateMatch[] = [];

  for (const p of players) {
    if (p.emailNormalized === newcomer.emailNormalized) {
      matches.push({ id: p.id, strength: "strong", reason: "same email address" });
      continue;
    }

    const tokens = nameTokens(p.name);
    if (newTokens.length >= 2 && tokens.join(" ") === newFull) {
      matches.push({ id: p.id, strength: "strong", reason: "same name" });
      continue;
    }

    const [first, last] = [tokens[0], tokens.at(-1)];
    const sameFirst = first !== undefined && first === newTokens[0];
    const sameLast = tokens.length >= 2 && newTokens.length >= 2 && last === newTokens.at(-1);
    if (sameFirst && sameLast) {
      matches.push({ id: p.id, strength: "likely", reason: "same first and last name" });
      continue;
    }

    // Name shows up in the other account's email ("Colin Jackson" → chwjackson@)
    const local = p.emailNormalized.split("@")[0];
    const newLast = newTokens.at(-1);
    const nameInEmail =
      (last !== undefined && last.length >= 4 && newLocal.includes(last) && sameFirst) ||
      (newLast !== undefined && newLast.length >= 4 && local.includes(newLast));
    if (nameInEmail) {
      matches.push({ id: p.id, strength: "likely", reason: "name matches email" });
    }
  }

  const rank = { strong: 0, likely: 1 };
  return matches.sort((a, b) => rank[a.strength] - rank[b.strength]);
}

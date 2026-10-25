import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

export const STATE = "e2e/.auth/player.json";
export const EMAIL_FILE = "e2e/.auth/email.txt";

/** Create a throwaway player and save a signed-in browser state for the tests. */
export default async function globalSetup() {
  const email = `e2e-${Date.now()}@example.test`;
  const token = execFileSync("npx", ["tsx", "scripts/test-session.mts", "create", email], { encoding: "utf8" }).trim();
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(EMAIL_FILE, email);
  writeFileSync(
    STATE,
    JSON.stringify({
      cookies: [
        { name: "authjs.session-token", value: token, domain: "localhost", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" },
      ],
      origins: [],
    })
  );
}

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

export const STATE = "e2e/.auth/player.json";
export const ADMIN_STATE = "e2e/.auth/admin.json";
export const EMAIL_FILE = "e2e/.auth/email.txt";

const session = (cmd: "create" | "create-admin", email: string) => {
  const token = execFileSync("npx", ["tsx", "scripts/test-session.mts", cmd, email], { encoding: "utf8" }).trim();
  return JSON.stringify({
    cookies: [
      { name: "authjs.session-token", value: token, domain: "localhost", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" },
    ],
    origins: [],
  });
};

/** Create a throwaway player and a throwaway admin, and save a signed-in browser state for each. */
export default async function globalSetup() {
  const stamp = Date.now();
  const emails = [`e2e-${stamp}@example.test`, `e2e-admin-${stamp}@example.test`];
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(EMAIL_FILE, emails.join("\n"));
  writeFileSync(STATE, session("create", emails[0]));
  writeFileSync(ADMIN_STATE, session("create-admin", emails[1]));
}

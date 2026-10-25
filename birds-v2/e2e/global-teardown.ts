import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Delete the throwaway player (cascades to everything the tests created). */
export default async function globalTeardown() {
  const email = readFileSync("e2e/.auth/email.txt", "utf8").trim();
  execFileSync("npx", ["tsx", "scripts/test-session.mts", "delete", email], { stdio: "inherit" });
}

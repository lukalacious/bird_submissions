import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Delete the throwaway player and admin (cascades to everything the tests created). */
export default async function globalTeardown() {
  for (const email of readFileSync("e2e/.auth/email.txt", "utf8").trim().split("\n")) {
    execFileSync("npx", ["tsx", "scripts/test-session.mts", "delete", email], { stdio: "inherit" });
  }
}

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The challenge month is SAST — only lib/challenge-time.ts may read
    // calendar parts off a Date (v1's UTC getMonth() calls caused month bugs)
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/challenge-time.ts", "src/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name=/^get(UTC)?(Month|FullYear|Date)$/]",
          message: "Use getChallengeMonth() from @/lib/challenge-time — the game runs on SAST, not server time.",
        },
      ],
    },
  },
  // "* 2.*", "* 3.*"… = iCloud conflict copies (the repo sits in iCloud-synced ~/Documents)
  globalIgnores([".next/**", ".next.nosync/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**", "**/* ?.*", "**/* ?/**", "birds-v2/**"]),
]);

export default eslintConfig;

import { defineConfig } from "vitest/config";

// `npm test` runs pure unit tests. `npm run test:int` runs *.int.test.ts
// against the v2-staging database from .env.
const integration = process.env.VITEST_INTEGRATION === "1";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: integration ? ["src/**/*.int.test.ts"] : ["src/**/*.test.ts"],
    exclude: integration ? [] : ["src/**/*.int.test.ts", "node_modules/**"],
  },
});

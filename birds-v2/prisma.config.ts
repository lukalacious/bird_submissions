import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations run on the direct (non-pooled) URL, into the "v2" Postgres
// schema — v1's tables in "public" are never touched.
const url = new URL(process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost/build");
url.searchParams.set("schema", "v2");
// Neon scales idle computes to zero; waking one can exceed Prisma's default
// 5s connect timeout and fail the deploy with P1001
url.searchParams.set("connect_timeout", "30");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: url.toString(),
  },
});

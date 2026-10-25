import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// v2 tables live in the "v2" Postgres schema (see prisma.config.ts)
const DB_SCHEMA = "v2";

function createClient() {
  const adapter = new PrismaNeon(
    { connectionString: process.env.DATABASE_URL },
    { schema: DB_SCHEMA }
  );
  return new PrismaClient({ adapter });
}

// Reuse one client across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

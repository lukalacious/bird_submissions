-- AlterTable
ALTER TABLE "UserJoker" ADD COLUMN IF NOT EXISTS "totalJokers" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: set totalJokers = jokers + bonusJokers for all existing rows
UPDATE "UserJoker" SET "totalJokers" = "jokers" + "bonusJokers";

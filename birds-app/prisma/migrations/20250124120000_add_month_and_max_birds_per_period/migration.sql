-- AlterTable Submission: add month, update unique and index
ALTER TABLE "Submission" ADD COLUMN "month" INTEGER NOT NULL DEFAULT 1;

-- Drop old unique constraint and create new one including month
ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_userId_regionId_birdName_year_key";
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_regionId_birdName_year_month_key" UNIQUE ("userId", "regionId", "birdName", "year", "month");

-- Drop old index and create new one including month
DROP INDEX IF EXISTS "Submission_userId_regionId_year_idx";
CREATE INDEX "Submission_userId_regionId_year_month_idx" ON "Submission"("userId", "regionId", "year", "month");

-- AlterTable Settings: rename maxBirdsPerSubmission to maxBirdsPerPeriod
ALTER TABLE "Settings" RENAME COLUMN "maxBirdsPerSubmission" TO "maxBirdsPerPeriod";

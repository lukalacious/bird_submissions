-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "maxEmptyMonths" INTEGER DEFAULT 2,
ADD COLUMN     "poolFractionalJokers" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "graceHours" SET DEFAULT 48;


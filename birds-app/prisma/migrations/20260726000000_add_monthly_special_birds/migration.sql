-- Add golden/photo bird lists to monthly settings (announced monthly by admins)
ALTER TABLE "MonthlySettings" ADD COLUMN "goldenBirds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MonthlySettings" ADD COLUMN "photoBirds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

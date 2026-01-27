-- Add rules column if it doesn't exist
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "rules" TEXT;

-- Rename feedbackFormEmbedUrl to monthlyFormEmbedUrl if it exists
-- If feedbackFormEmbedUrl doesn't exist, create monthlyFormEmbedUrl
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Settings'
        AND column_name = 'feedbackFormEmbedUrl'
    ) THEN
        ALTER TABLE "Settings" RENAME COLUMN "feedbackFormEmbedUrl" TO "monthlyFormEmbedUrl";
    ELSE
        ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "monthlyFormEmbedUrl" TEXT;
    END IF;
END $$;

-- Photo-only re-twitch: a bird twitched in an earlier month can be
-- photographed later when it's announced as a golden/photo bird.
-- photoYear/photoMonth record the challenge month the photo belongs to
-- (null = same as the submission's own year/month).
ALTER TABLE "Submission" ADD COLUMN "photoYear" INTEGER;
ALTER TABLE "Submission" ADD COLUMN "photoMonth" INTEGER;

-- Manual admin awards for bonus-bird photos. Stored on the submission so
-- the nightly form-joker recompute can merge them into bonusJokers.
ALTER TABLE "Submission" ADD COLUMN "photoAwardJokers" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Submission" ADD COLUMN "photoAwardedAt" TIMESTAMP(3);

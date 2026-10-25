-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE INDEX "LinkRequest_requesterId_status_idx" ON "LinkRequest"("requesterId", "status");


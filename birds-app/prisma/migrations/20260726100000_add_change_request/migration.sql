-- Change requests: users file edits for locked past months; admins resolve
CREATE TYPE "ChangeRequestType" AS ENUM ('SWAP', 'DELETE', 'OTHER');
CREATE TYPE "ChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChangeRequestType" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "birdName" TEXT,
    "replacementBird" TEXT,
    "note" TEXT,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");
CREATE INDEX "ChangeRequest_userId_idx" ON "ChangeRequest"("userId");

ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

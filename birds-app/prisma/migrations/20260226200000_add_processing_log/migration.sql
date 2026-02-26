-- CreateTable
CREATE TABLE "ProcessingLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessingLog_type_year_month_idx" ON "ProcessingLog"("type", "year", "month");

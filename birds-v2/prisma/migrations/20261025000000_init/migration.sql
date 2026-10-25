-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "v2";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JokerSpendReason" AS ENUM ('AUTO_ELIMINATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "SpecialBirdKind" AS ENUM ('GOLDEN', 'PHOTO');

-- CreateEnum
CREATE TYPE "ChangeRequestType" AS ENUM ('SWAP', 'DELETE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "username" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "defaultRegionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "LinkRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "LinkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergeEvent" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "movedRows" JSONB NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Species" (
    "id" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "groupId" TEXT,

    CONSTRAINT "Species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bird" (
    "id" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "alphabeticalName" TEXT NOT NULL,

    CONSTRAINT "Bird_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "birdId" TEXT,
    "speciesId" TEXT,
    "customName" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isLifer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "takenAt" TIMESTAMP(3),
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "jokerAward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "within15km" BOOLEAN NOT NULL DEFAULT false,
    "beyond750km" BOOLEAN NOT NULL DEFAULT false,
    "nonMotorisedCount" INTEGER NOT NULL DEFAULT 0,
    "liferCount" INTEGER NOT NULL DEFAULT 0,
    "goldenCount" INTEGER NOT NULL DEFAULT 0,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "primaryLocation" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJoker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "jokers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusJokers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalJokers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedJokers" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonusBreakdown" JSONB,

    CONSTRAINT "UserJoker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JokerSpend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coversYear" INTEGER NOT NULL,
    "coversMonth" INTEGER NOT NULL,
    "fromYear" INTEGER NOT NULL,
    "fromMonth" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" "JokerSpendReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JokerSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChallengeStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedAt" TIMESTAMP(3),
    "eliminationMonth" INTEGER,
    "joinedMonth" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserChallengeStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "currentYear" INTEGER NOT NULL,
    "maxBirdsPerPeriod" INTEGER NOT NULL DEFAULT 31,
    "eliminationThreshold" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    "graceHours" INTEGER NOT NULL DEFAULT 0,
    "checkInDeadlineDay" INTEGER NOT NULL DEFAULT 7,
    "rules" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySettings" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "maxBirdsPerPeriod" INTEGER NOT NULL,
    "eliminationThreshold" INTEGER,

    CONSTRAINT "MonthlySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialBird" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "kind" "SpecialBirdKind" NOT NULL,
    "speciesId" TEXT NOT NULL,

    CONSTRAINT "SpecialBird_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ChangeRequestType" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "submissionId" TEXT,
    "replacementBirdId" TEXT,
    "note" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" JSONB,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_emailNormalized_idx" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "LinkRequest_status_idx" ON "LinkRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_key" ON "Region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Species_scientificName_key" ON "Species"("scientificName");

-- CreateIndex
CREATE INDEX "Species_groupId_idx" ON "Species"("groupId");

-- CreateIndex
CREATE INDEX "Bird_speciesId_idx" ON "Bird"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "Bird_regionId_displayName_key" ON "Bird"("regionId", "displayName");

-- CreateIndex
CREATE INDEX "Submission_userId_year_month_idx" ON "Submission"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "Submission_year_month_idx" ON "Submission"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_userId_speciesId_year_key" ON "Submission"("userId", "speciesId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_userId_customName_year_key" ON "Submission"("userId", "customName", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_submissionId_key" ON "Photo"("submissionId");

-- CreateIndex
CREATE INDEX "Photo_userId_year_month_idx" ON "Photo"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "Photo_status_idx" ON "Photo"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyCheckIn_userId_year_month_key" ON "MonthlyCheckIn"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "UserJoker_userId_year_month_key" ON "UserJoker"("userId", "year", "month");

-- CreateIndex
CREATE INDEX "JokerSpend_userId_coversYear_coversMonth_idx" ON "JokerSpend"("userId", "coversYear", "coversMonth");

-- CreateIndex
CREATE INDEX "UserChallengeStatus_year_isEliminated_idx" ON "UserChallengeStatus"("year", "isEliminated");

-- CreateIndex
CREATE UNIQUE INDEX "UserChallengeStatus_userId_year_key" ON "UserChallengeStatus"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySettings_year_month_key" ON "MonthlySettings"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialBird_year_month_kind_speciesId_key" ON "SpecialBird"("year", "month", "kind", "speciesId");

-- CreateIndex
CREATE INDEX "ChangeRequest_status_idx" ON "ChangeRequest"("status");

-- CreateIndex
CREATE INDEX "ChangeRequest_userId_idx" ON "ChangeRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CronRun_type_year_month_key" ON "CronRun"("type", "year", "month");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_defaultRegionId_fkey" FOREIGN KEY ("defaultRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkRequest" ADD CONSTRAINT "LinkRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkRequest" ADD CONSTRAINT "LinkRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Species" ADD CONSTRAINT "Species_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bird" ADD CONSTRAINT "Bird_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bird" ADD CONSTRAINT "Bird_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_birdId_fkey" FOREIGN KEY ("birdId") REFERENCES "Bird"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyCheckIn" ADD CONSTRAINT "MonthlyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJoker" ADD CONSTRAINT "UserJoker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JokerSpend" ADD CONSTRAINT "JokerSpend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallengeStatus" ADD CONSTRAINT "UserChallengeStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialBird" ADD CONSTRAINT "SpecialBird_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


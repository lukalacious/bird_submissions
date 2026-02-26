import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMonthlySettings } from "@/lib/settings-utils";

// This endpoint should be called on the 1st of every month via cron
// It checks all users for the PREVIOUS month and applies elimination logic

export async function POST(request: NextRequest) {
  // Verify cron secret or admin authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if: valid cron secret OR no secret configured (dev mode)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonthlyEliminationCheck();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Elimination check failed:", error);
    return NextResponse.json(
      { error: "Failed to run elimination check" },
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing in development
export async function GET(request: NextRequest) {
  // Only allow in development or with proper auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMonthlyEliminationCheck();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Elimination check failed:", error);
    return NextResponse.json(
      { error: "Failed to run elimination check" },
      { status: 500 }
    );
  }
}

interface EliminationResult {
  userId: string;
  userName: string;
  submissions: number;
  threshold: number;
  action: "safe" | "joker_used" | "eliminated" | "already_eliminated" | "skipped_join_month";
}

async function runMonthlyEliminationCheck(): Promise<{
  success: boolean;
  year: number;
  month: number;
  processed: number;
  eliminated: number;
  jokersUsed: number;
  results: EliminationResult[];
}> {
  const settings = await prisma.settings.findFirst();
  const currentYear = settings?.currentYear ?? new Date().getFullYear();

  // Check for PREVIOUS month
  const now = new Date();
  let checkMonth = now.getMonth(); // 0-indexed, so this is previous month (current - 1)
  let checkYear = currentYear;

  // Handle January (check December of previous year)
  if (checkMonth === 0) {
    checkMonth = 12;
    checkYear = currentYear - 1;
  }

  // Get threshold for the month being checked
  const monthlySettings = await getMonthlySettings(checkYear, checkMonth);
  const threshold = monthlySettings.eliminationThreshold;

  // Get all users who have submitted this year OR have challenge status
  const usersToCheck = await prisma.user.findMany({
    where: {
      OR: [
        { submissions: { some: { year: checkYear } } },
        { challengeStatus: { some: { year: checkYear } } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      challengeStatus: {
        where: { year: checkYear },
      },
      submissions: {
        where: { year: checkYear, month: checkMonth },
      },
      jokers: {
        where: { year: checkYear },
      },
    },
  });

  const results: EliminationResult[] = [];
  let eliminatedCount = 0;
  let jokersUsedCount = 0;

  for (const user of usersToCheck) {
    const status = user.challengeStatus[0];
    const submissionCount = user.submissions.length;
    const userName = user.username || user.name || "Anonymous";

    // Initialize challenge status if not exists
    if (!status) {
      await prisma.userChallengeStatus.create({
        data: {
          userId: user.id,
          year: checkYear,
          joinedMonth: checkMonth,
          isEliminated: false,
        },
      });

      // User just joined, skip this month's check
      results.push({
        userId: user.id,
        userName,
        submissions: submissionCount,
        threshold,
        action: "skipped_join_month",
      });
      continue;
    }

    // Skip if already eliminated
    if (status.isEliminated) {
      results.push({
        userId: user.id,
        userName,
        submissions: submissionCount,
        threshold,
        action: "already_eliminated",
      });
      continue;
    }

    // Skip if user joined after this month
    if (status.joinedMonth > checkMonth) {
      results.push({
        userId: user.id,
        userName,
        submissions: submissionCount,
        threshold,
        action: "skipped_join_month",
      });
      continue;
    }

    // User meets threshold - safe
    if (submissionCount >= threshold) {
      results.push({
        userId: user.id,
        userName,
        submissions: submissionCount,
        threshold,
        action: "safe",
      });
      continue;
    }

    // User below threshold - check for jokers from PREVIOUS months only
    // (jokers earned in month X can only be used in months > X)
    const jokersFromPreviousMonths = user.jokers.filter(j => j.month < checkMonth);
    const totalJokers = jokersFromPreviousMonths.reduce((sum, j) => sum + j.totalJokers, 0);
    const usedJokers = jokersFromPreviousMonths.reduce((sum, j) => sum + j.usedJokers, 0);
    const availableJokers = totalJokers - usedJokers;

    if (availableJokers >= 1) {
      // Find a joker record from a previous month to use (oldest first - FIFO)
      const sortedJokers = jokersFromPreviousMonths
        .filter((j) => j.totalJokers - j.usedJokers >= 1)
        .sort((a, b) => a.month - b.month);
      const jokerToUse = sortedJokers[0];

      if (jokerToUse) {
        await prisma.userJoker.update({
          where: { id: jokerToUse.id },
          data: { usedJokers: { increment: 1 } },
        });

        jokersUsedCount++;
        results.push({
          userId: user.id,
          userName,
          submissions: submissionCount,
          threshold,
          action: "joker_used",
        });
        continue;
      }
    }

    // No jokers available - eliminate user
    await prisma.userChallengeStatus.update({
      where: { userId_year: { userId: user.id, year: checkYear } },
      data: {
        isEliminated: true,
        eliminatedAt: new Date(),
        eliminationMonth: checkMonth,
      },
    });

    eliminatedCount++;
    results.push({
      userId: user.id,
      userName,
      submissions: submissionCount,
      threshold,
      action: "eliminated",
    });
  }

  console.log(
    `Elimination check complete for ${checkMonth}/${checkYear}: ` +
    `${usersToCheck.length} users checked, ${eliminatedCount} eliminated, ${jokersUsedCount} jokers used`
  );

  return {
    success: true,
    year: checkYear,
    month: checkMonth,
    processed: usersToCheck.length,
    eliminated: eliminatedCount,
    jokersUsed: jokersUsedCount,
    results,
  };
}

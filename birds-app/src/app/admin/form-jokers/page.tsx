import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FormJokerPanel } from "./form-joker-panel";

export type ProcessingHistoryEntry = {
  month: number;
  processedAt: string; // ISO string for serialization
  processedBy: string; // Admin name or email
  matchedCount: number;
  unmatchedCount: number;
};

export default async function AdminFormJokersPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Get current year from settings
  const settings = await prisma.settings.findFirst();
  const currentYear = settings?.currentYear ?? new Date().getFullYear();

  // Fetch all processing logs for this year, ordered newest first
  const logs = await prisma.processingLog.findMany({
    where: { type: "bonus_jokers", year: currentYear },
    orderBy: { processedAt: "desc" },
  });

  // Deduplicate to latest processing per month
  const latestByMonth = new Map<number, (typeof logs)[0]>();
  for (const log of logs) {
    if (!latestByMonth.has(log.month)) {
      latestByMonth.set(log.month, log);
    }
  }

  // Resolve admin names
  const adminIds = [...new Set([...latestByMonth.values()].map((l) => l.processedBy))];
  const admins = adminIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, name: true, username: true, email: true },
      })
    : [];
  const adminNameById = new Map(
    admins.map((a) => [a.id, a.username || a.name || a.email])
  );

  const processingHistory: ProcessingHistoryEntry[] = [...latestByMonth.entries()].map(
    ([month, log]) => ({
      month,
      processedAt: log.processedAt.toISOString(),
      processedBy: adminNameById.get(log.processedBy) || "Unknown",
      matchedCount: log.matchedCount,
      unmatchedCount: log.unmatchedCount,
    })
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Form Jokers</h1>
      <p className="text-gray-600 mb-6">
        Process monthly Google Form responses to award bonus jokers.
      </p>
      <FormJokerPanel
        processingHistory={processingHistory}
        currentYear={currentYear}
      />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { EliminationManagement } from "./elimination-management";

export default async function AdminEliminationPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const settings = await prisma.settings.findFirst();
  const currentYear = settings?.currentYear || new Date().getFullYear();
  const threshold = settings?.eliminationThreshold || 30;

  // Get all users with their challenge status and submissions
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      challengeStatus: {
        where: { year: currentYear },
      },
      submissions: {
        where: { year: currentYear },
        select: { month: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const usersWithStats = users.map((user) => {
    const status = user.challengeStatus[0];
    const monthCounts = new Map<number, number>();
    for (const sub of user.submissions) {
      monthCounts.set(sub.month, (monthCounts.get(sub.month) || 0) + 1);
    }

    return {
      id: user.id,
      name: user.username || user.name || "Anonymous",
      email: user.email,
      image: user.image,
      isEliminated: status?.isEliminated || false,
      eliminationMonth: status?.eliminationMonth || null,
      joinedMonth: status?.joinedMonth || 1,
      monthlySubmissions: Object.fromEntries(monthCounts),
      totalSubmissions: user.submissions.length,
    };
  });

  return (
    <EliminationManagement
      users={usersWithStats}
      currentYear={currentYear}
      threshold={threshold}
    />
  );
}

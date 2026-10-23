import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function csvField(value: string): string {
  // Quote everything; double any inner quotes per RFC 4180
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Real birds only — joker placeholder rows aren't twitches
  const submissions = await prisma.submission.findMany({
    where: { userId: session.user.id, isJokerSubmission: false },
    orderBy: [{ year: "asc" }, { month: "asc" }, { birdName: "asc" }],
    select: {
      birdName: true,
      year: true,
      month: true,
      isCustomBird: true,
      photoUrl: true,
      createdAt: true,
      region: { select: { label: true } },
    },
  });

  const header = ["Year", "Month", "Bird", "Region", "Custom bird", "Photo", "Submitted on"];
  const rows = submissions.map((s) =>
    [
      String(s.year),
      String(s.month),
      s.birdName,
      s.region.label,
      s.isCustomBird ? "yes" : "",
      s.photoUrl ?? "",
      s.createdAt.toISOString().split("T")[0],
    ]
      .map(csvField)
      .join(",")
  );

  // UTF-8 BOM so Excel renders apostrophes/diacritics in bird names correctly
  const csv = "\uFEFF" + [header.map(csvField).join(","), ...rows].join("\r\n") + "\r\n";

  const years = [...new Set(submissions.map((s) => s.year))].sort();
  const yearLabel = years.length > 0 ? `${years[0]}${years.length > 1 ? `-${years[years.length - 1]}` : ""}` : "empty";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="twitch-birds-${yearLabel}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

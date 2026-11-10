import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { csvResponse } from "@/lib/csv";

/** A player's own birds, every season, as a spreadsheet (v1 had this on My Submissions). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first", { status: 401 });

  const subs = await db.submission.findMany({
    where: { userId: user.id },
    orderBy: [{ year: "asc" }, { month: "asc" }, { createdAt: "asc" }],
    select: {
      year: true, month: true, createdAt: true, isLifer: true, customName: true,
      region: { select: { label: true } },
      bird: { select: { displayName: true, species: { select: { scientificName: true, group: { select: { name: true } } } } } },
      photo: { select: { status: true } },
    },
  });
  const years = [...new Set(subs.map((s) => s.year))];
  const span = years.length === 0 ? "empty" : years.length === 1 ? String(years[0]) : `${years[0]}-${years.at(-1)}`;
  return csvResponse(
    [
      ["year", "month", "bird", "scientific name", "family", "region", "lifer", "unlisted", "photo", "added"],
      ...subs.map((s) => [
        s.year, s.month, s.bird?.displayName ?? s.customName, s.bird?.species.scientificName ?? "", s.bird?.species.group?.name ?? "",
        s.region.label, s.isLifer ? "yes" : "", s.bird ? "" : "yes", s.photo ? s.photo.status.toLowerCase() : "", s.createdAt.toISOString(),
      ]),
    ],
    `my-twitch-birds-${span}.csv`
  );
}

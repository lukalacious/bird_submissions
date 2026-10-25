import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { getChallengeMonth } from "@/lib/challenge-time";

const csv = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // quote everything that could break a cell; neutralise spreadsheet formulas
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/** Season export for Dale's records (replaces the Sheets sync). Admins only. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return new Response("Not allowed", { status: 403 });
  const year = Number(new URL(request.url).searchParams.get("year")) || getChallengeMonth().year;

  const subs = await db.submission.findMany({
    where: { year },
    orderBy: [{ month: "asc" }, { createdAt: "asc" }],
    select: {
      month: true, createdAt: true, isLifer: true, customName: true,
      user: { select: { name: true, username: true, email: true } },
      region: { select: { label: true } },
      bird: { select: { displayName: true, species: { select: { scientificName: true, group: { select: { name: true } } } } } },
      photo: { select: { url: true, status: true } },
    },
  });
  const rows = [
    ["month", "added", "player", "email", "region", "bird", "scientific name", "group", "lifer", "golden proof photo", "photo status"],
    ...subs.map((s) => [
      s.month, s.createdAt.toISOString(), s.user.username ?? s.user.name, s.user.email, s.region.label,
      s.bird?.displayName ?? s.customName, s.bird?.species.scientificName ?? "", s.bird?.species.group?.name ?? "",
      s.isLifer ? "yes" : "", s.photo?.url ?? "", s.photo?.status.toLowerCase() ?? "",
    ]),
  ];
  return new Response(rows.map((r) => r.map(csv).join(",")).join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="twitch-${year}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

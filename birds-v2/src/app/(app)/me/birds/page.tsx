import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth, openMonths } from "@/lib/challenge-time";
import { getGoldenSpecies, getPlayerSeason } from "@/lib/checklist";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { SeasonList } from "./season-list";

export const metadata = { title: "My birds" };

export default function MyBirdsPage({ searchParams }: PageProps<"/me/birds">) {
  return (
    <div className="space-y-6">
      <Link href="/me" className="font-semibold text-roller underline underline-offset-4">
        Back to Me
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Season searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Season({ searchParams }: Pick<PageProps<"/me/birds">, "searchParams">) {
  await connection();
  const user = await requirePlayer();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const months = openMonths({ graceHours: settings.graceHours, timeZone: settings.timezone });
  const [{ birds }, { requested }, goldenLists] = await Promise.all([
    getPlayerSeason(user.id, current.year),
    searchParams,
    Promise.all(months.map((m) => getGoldenSpecies(m))),
  ]);
  const open = months.filter((m) => m.year === current.year).map((m) => m.month);
  return (
    <>
    <SeasonList
      userId={user.id}
      year={current.year}
      current={current}
      birds={birds}
      openMonths={open}
      photoSpecies={[...new Set(goldenLists.flat())]}
      requested={requested === "1"}
    />
    <MyRequests userId={user.id} year={current.year} />
    </>
  );
}

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });
const STATUS = { PENDING: "Waiting for an admin", APPROVED: "Done", REJECTED: "Declined" } as const;

/** v1 never showed players what became of a request; a declined one just vanished. */
async function MyRequests({ userId, year }: { userId: string; year: number }) {
  const requests = await db.changeRequest.findMany({ where: { userId, year }, orderBy: { createdAt: "desc" }, take: 20 });
  if (requests.length === 0) return null;
  return (
    <section aria-labelledby="requests-heading" className="space-y-3">
      <h2 id="requests-heading" className="text-xl font-semibold">
        Changes you asked for
      </h2>
      <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
        {requests.map((r) => (
          <li key={r.id} className="space-y-1 px-4 py-3">
            <p>
              {MONTH.format(new Date(Date.UTC(r.year, r.month - 1, 15)))}:{" "}
              {r.type === "SWAP" ? `swap ${r.birdLabel ?? "a bird"} for ${r.replacementLabel ?? "another bird"}` : r.type === "DELETE" ? `remove ${r.birdLabel ?? "a bird"}` : (r.note ?? "something else")}
            </p>
            <p className="text-sm">
              <strong>{STATUS[r.status]}</strong>
              {r.adminNote && <span className="text-ink-soft"> · “{r.adminNote}”</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Camera } from "lucide-react";
import { TimeAgo } from "@/components/time-ago";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { getFeed, getGallery, getLeaderboard } from "@/lib/flock";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Flock" };

const TABS = [
  { key: "feed", label: "Latest" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "photos", label: "Photos" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });

export default function FlockPage({ searchParams }: PageProps<"/flock">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Flock</h1>
      <Suspense fallback={<TabsSkeleton />}>
        <FlockTabs searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FlockTabs({ searchParams }: Pick<PageProps<"/flock">, "searchParams">) {
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === raw) ? (raw as Tab) : "feed";

  return (
    <>
      <nav aria-label="Flock sections" className="grid grid-cols-3 gap-1 rounded-xl bg-paper-sunk p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "feed" ? "/flock" : `/flock?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            prefetch
            className={`flex min-h-11 items-center justify-center rounded-lg font-semibold ${
              tab === t.key ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {/* Only the open tab's data is fetched (v1 loaded all five every time) */}
      <Suspense key={tab} fallback={<ListSkeleton />}>
        {tab === "feed" && <Feed />}
        {tab === "leaderboard" && <Leaderboard />}
        {tab === "photos" && <Gallery />}
      </Suspense>
    </>
  );
}

async function Feed() {
  await requirePlayer();
  const items = await getFeed();
  if (items.length === 0) return <p className="text-ink-soft">Nobody has twitched anything yet. Be first.</p>;
  return (
    <ul className="divide-y divide-rule rounded-2xl border border-rule bg-paper-raised">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-3 px-4 py-3">
          {i.playerImage ? (
            <Image src={i.playerImage} alt="" width={40} height={40} className="size-10 rounded-full" />
          ) : (
            <span aria-hidden className="size-10 rounded-full bg-paper-sunk" />
          )}
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{i.playerName}</span> twitched{" "}
            <span className="font-semibold">{i.bird}</span>
            {i.isLifer && <span className="ml-1 text-sm text-lilac">lifer</span>}
            <span className="block text-sm text-ink-soft">
              {i.region}, <TimeAgo iso={i.at} />
            </span>
          </p>
          {i.photoUrl && (
            <Image src={i.photoUrl} alt={`${i.playerName}'s ${i.bird}`} width={56} height={56} className="size-14 rounded-lg object-cover" />
          )}
        </li>
      ))}
    </ul>
  );
}

async function Leaderboard() {
  await connection();
  const me = await requirePlayer();
  const settings = await getSettings();
  const month = getChallengeMonth(new Date(), settings.timezone);
  const rows = await getLeaderboard(month);
  const monthName = MONTH.format(new Date(Date.UTC(month.year, month.month - 1, 15)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">Leaderboard for {monthName}</caption>
        <thead className="text-sm text-ink-soft">
          <tr>
            <th scope="col" className="py-2 pr-2 font-semibold">#</th>
            <th scope="col" className="py-2 pr-2 font-semibold">Player</th>
            <th scope="col" className="py-2 pr-2 text-right font-semibold">{monthName}</th>
            <th scope="col" className="py-2 text-right font-semibold">Season</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((r, i) => (
            <tr key={r.userId} className={r.userId === me.id ? "bg-roller-wash" : r.isEliminated ? "text-ink-soft" : ""}>
              <td className="py-2 pr-2 tabular-nums">{r.isEliminated ? "" : i + 1}</td>
              <td className="py-2 pr-2">
                {r.name}
                {r.userId === me.id && <span className="sr-only"> (you)</span>}
                {r.isEliminated && <span className="ml-2 text-sm">out</span>}
              </td>
              <td className="py-2 pr-2 text-right font-semibold tabular-nums">{r.monthBirds}</td>
              <td className="py-2 text-right tabular-nums">{r.seasonBirds}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Gallery() {
  await requirePlayer();
  const photos = await getGallery();
  if (photos.length === 0) {
    return (
      <p className="flex items-center gap-2 text-ink-soft">
        <Camera aria-hidden className="size-5" /> No photos yet. Add one from your list on Twitch.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((p) => (
        <li key={p.id} className="overflow-hidden rounded-2xl bg-paper-raised">
          <Image
            src={p.url}
            alt={`${p.bird}, photographed by ${p.playerName}`}
            width={p.width ?? 600}
            height={p.height ?? 600}
            sizes="(min-width: 640px) 33vw, 50vw"
            className="aspect-square w-full object-cover"
          />
          <p className="px-3 py-2 text-sm">
            <span className="font-semibold">{p.bird}</span>
            <span className="block text-ink-soft">{p.playerName}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function TabsSkeleton() {
  return <div className="h-12 animate-pulse rounded-xl bg-paper-sunk" />;
}

function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-16 rounded-xl bg-paper-sunk" />
      ))}
    </div>
  );
}

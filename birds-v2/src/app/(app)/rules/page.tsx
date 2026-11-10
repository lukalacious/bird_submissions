import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { requirePlayer } from "@/lib/dal";
import { getChallengeMonth } from "@/lib/challenge-time";
import { PHOTO_PROOF_FROM_SEASON } from "@/lib/rules/check-in-bonus";
import { getMonthRules, getSettings } from "@/lib/settings";

export const metadata = { title: "How the game works" };

const MONTH = new Intl.DateTimeFormat("en-ZA", { month: "long", timeZone: "UTC" });

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-roller">
        ‹ Back to Today
      </Link>
      <h1 className="text-3xl font-semibold">How the game works</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper-sunk" aria-busy="true" />}>
        <Rules />
      </Suspense>
    </div>
  );
}

/** Admin text in v1's format: a line "**Heading:** text" becomes a heading with its paragraph. */
function parseOrganiserRules(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^\*\*(.+?):?\*\*:?\s*(.*)$/.exec(line);
      return m ? { heading: m[1], body: m[2] } : { heading: null, body: line };
    });
}

async function Rules() {
  await connection(); // this month's numbers depend on the clock
  await requirePlayer();
  const settings = await getSettings();
  const current = getChallengeMonth(new Date(), settings.timezone);
  const { maxBirds, eliminationThreshold } = await getMonthRules(current);
  const month = MONTH.format(new Date(Date.UTC(current.year, current.month - 1, 15)));
  const photoProof = current.year >= PHOTO_PROOF_FROM_SEASON;
  const organiser = settings.rules ? parseOrganiserRules(settings.rules) : [];

  const sections: { title: string; points: string[] }[] = [
    {
      title: "A bird a day",
      points: [
        `You can twitch up to ${maxBirds} birds in ${month}.`,
        "A species counts once per season, whichever region you see it in.",
        "A bird that isn't on the list can be added by name as an unlisted bird. Unlisted birds count towards your month but not towards family jokers.",
      ],
    },
    {
      title: "Staying in",
      points: [
        `You need ${eliminationThreshold} birds in ${month} to stay in.`,
        "Each bird you're short costs one joker, taken automatically at month-end from the oldest month first.",
        "Short with not enough jokers, and you're out for the season. You can still follow Sightings.",
        ...(settings.maxEmptyMonths
          ? [`${settings.maxEmptyMonths} months in a row with no birds at all ends your season, even with jokers left.`]
          : []),
        settings.poolFractionalJokers
          ? "Half jokers from different months add up: two halves cover one missing bird."
          : "Only whole jokers can be spent, each from a month that still holds a whole one.",
        "The month you join doesn't count towards elimination.",
      ],
    },
    {
      title: "Family jokers",
      points: [
        "Three birds from the same family in one month earn 1 joker. Every further bird of that family that month adds half a joker.",
        "Jokers earned in a month can be used from the next month on.",
        "Twitch shows the joker a bird would earn before you add it.",
      ],
    },
    {
      title: "Bonus jokers from the check-in",
      points: [
        "Every bird of the month within 15 km of home: +5.",
        "Any bird more than 750 km from home: −3.",
        "Birds seen without a motorised vehicle: +1 for every 10, up to 3.",
        "Lifers: +1 each, up to 5.",
        photoProof
          ? "Golden birds: +1 for each one proven with a photo that month, up to 5. Add the photo from your list on Twitch."
          : "Golden birds: +1 each, up to 5.",
      ],
    },
    {
      title: "Deadlines",
      points: [
        "A month closes at midnight South African time on its last day.",
        settings.graceHours > 0
          ? `For ${settings.graceHours} hours after that you can still fix last month's list yourself.`
          : "Once it closes, last month's list is final.",
        `The check-in opens on the 20th and closes at the end of day ${settings.checkInDeadlineDay} of the next month.`,
        "After a month is final, ask for a change from My birds. An admin applies it and your jokers update.",
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {sections.map((s) => (
        <section key={s.title} aria-labelledby={`rule-${s.title}`} className="space-y-2">
          <h2 id={`rule-${s.title}`} className="text-xl font-semibold">
            {s.title}
          </h2>
          <ul className="max-w-prose list-disc space-y-1 pl-5">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}

      {organiser.length > 0 && (
        <section aria-labelledby="organiser-heading" className="space-y-2 rounded-2xl border border-rule bg-paper-raised p-5">
          <h2 id="organiser-heading" className="text-xl font-semibold">
            From the organisers
          </h2>
          <div className="max-w-prose space-y-2">
            {organiser.map((r, i) => (
              <p key={i}>
                {r.heading && <strong>{r.heading}: </strong>}
                {r.body}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

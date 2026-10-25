import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requirePlayer } from "@/lib/dal";
import { getRegionBirds } from "@/lib/checklist";
import { RequestForm } from "./request-form";

export const metadata = { title: "Request a change" };

export default function RequestPage({ searchParams }: PageProps<"/me/request">) {
  return (
    <div className="space-y-6">
      <Link href="/me/birds" className="font-semibold text-roller underline underline-offset-4">Back to my birds</Link>
      <h1 className="text-3xl font-semibold">Request a change</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper-sunk" />}>
        <Request searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Request({ searchParams }: Pick<PageProps<"/me/request">, "searchParams">) {
  const user = await requirePlayer();
  const { submission } = await searchParams;
  const sub =
    typeof submission === "string"
      ? await db.submission.findFirst({
          where: { id: submission, userId: user.id },
          select: { id: true, regionId: true, customName: true, bird: { select: { displayName: true } } },
        })
      : null;
  if (!sub) return <p>That bird isn&apos;t on your list.</p>;
  const label = sub.bird?.displayName ?? sub.customName ?? "this bird";
  return (
    <>
      <p className="max-w-prose text-ink-soft">That month has closed, so an admin makes the change. You&apos;ll see it on your list once it&apos;s approved, and your jokers update automatically.</p>
      <RequestForm submissionId={sub.id} birdLabel={label} regionBirds={await getRegionBirds(sub.regionId)} />
    </>
  );
}

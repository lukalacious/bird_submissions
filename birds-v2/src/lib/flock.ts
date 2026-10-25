import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { ChallengeMonth } from "@/lib/challenge-time";
import { feedTag, leaderboardTag } from "@/lib/tags";

/**
 * Community reads. Same for every viewer, so they're cached server-side and
 * refreshed by the tags submitBirds/removeBird/attachPhoto update.
 */

export interface LeaderRow {
  userId: string;
  name: string;
  image: string | null;
  monthBirds: number;
  seasonBirds: number;
  isEliminated: boolean;
}

export async function getLeaderboard(month: ChallengeMonth): Promise<LeaderRow[]> {
  "use cache";
  cacheTag(leaderboardTag(month));
  cacheLife("minutes");

  const [monthCounts, seasonCounts, users, statuses] = await Promise.all([
    db.submission.groupBy({ by: ["userId"], where: month, _count: { _all: true } }),
    db.submission.groupBy({ by: ["userId"], where: { year: month.year }, _count: { _all: true } }),
    db.user.findMany({ select: { id: true, name: true, username: true, image: true } }),
    db.userChallengeStatus.findMany({ where: { year: month.year, isEliminated: true }, select: { userId: true } }),
  ]);
  const monthBy = new Map(monthCounts.map((c) => [c.userId, c._count._all]));
  const seasonBy = new Map(seasonCounts.map((c) => [c.userId, c._count._all]));
  const out = new Set(statuses.map((s) => s.userId));

  return users
    .filter((u) => seasonBy.has(u.id))
    .map((u) => ({
      userId: u.id,
      name: u.username ?? u.name ?? "Player",
      image: u.image,
      monthBirds: monthBy.get(u.id) ?? 0,
      seasonBirds: seasonBy.get(u.id) ?? 0,
      isEliminated: out.has(u.id),
    }))
    .sort((a, b) => Number(a.isEliminated) - Number(b.isEliminated) || b.monthBirds - a.monthBirds || b.seasonBirds - a.seasonBirds || a.name.localeCompare(b.name));
}

export interface FeedItem {
  id: string;
  playerName: string;
  playerImage: string | null;
  bird: string;
  region: string;
  isLifer: boolean;
  photoUrl: string | null;
  at: string;
}

export async function getFeed(): Promise<FeedItem[]> {
  "use cache";
  cacheTag(feedTag);
  cacheLife("minutes");

  const subs = await db.submission.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      createdAt: true,
      isLifer: true,
      customName: true,
      user: { select: { name: true, username: true, image: true } },
      bird: { select: { displayName: true } },
      region: { select: { label: true } },
      photo: { select: { url: true, status: true } },
    },
  });
  return subs.map((s) => ({
    id: s.id,
    playerName: s.user.username ?? s.user.name ?? "Player",
    playerImage: s.user.image,
    bird: s.bird?.displayName ?? s.customName ?? "Unknown bird",
    region: s.region.label,
    isLifer: s.isLifer,
    photoUrl: s.photo && s.photo.status !== "REJECTED" ? s.photo.url : null,
    at: s.createdAt.toISOString(),
  }));
}

export interface GalleryPhoto {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  bird: string;
  playerName: string;
}

export async function getGallery(): Promise<GalleryPhoto[]> {
  "use cache";
  cacheTag(feedTag);
  cacheLife("minutes");

  const photos = await db.photo.findMany({
    where: { status: { not: "REJECTED" } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      url: true,
      width: true,
      height: true,
      user: { select: { name: true, username: true } },
      submission: { select: { customName: true, bird: { select: { displayName: true } } } },
    },
  });
  return photos.map((p) => ({
    id: p.id,
    url: p.url,
    width: p.width,
    height: p.height,
    bird: p.submission.bird?.displayName ?? p.submission.customName ?? "Unknown bird",
    playerName: p.user.username ?? p.user.name ?? "Player",
  }));
}

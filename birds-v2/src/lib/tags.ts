import type { ChallengeMonth } from "@/lib/challenge-time";

/** Cache tags shared by readers (use cache) and writers (updateTag). */
export const leaderboardTag = (m: ChallengeMonth) => `leaderboard:${m.year}-${m.month}`;
export const feedTag = "feed";

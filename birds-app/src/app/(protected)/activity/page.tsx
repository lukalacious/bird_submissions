import { getCommunityFeed, getLeaderboard } from "@/app/actions/feed-actions";
import { CommunitySection } from "../region/community-section";
import { Users } from "lucide-react";

export default async function ActivityPage() {
  const [communityFeed, monthlyLeaderboard, allTimeLeaderboard] = await Promise.all([
    getCommunityFeed(50),
    getLeaderboard("month"),
    getLeaderboard("alltime"),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Users className="h-7 w-7 text-purple-600" />
          Activity
        </h1>
        <p className="text-gray-600">Community feed and leaderboards</p>
      </div>

      <CommunitySection
        feedEntries={communityFeed}
        monthlyLeaderboard={monthlyLeaderboard}
        allTimeLeaderboard={allTimeLeaderboard}
      />
    </div>
  );
}

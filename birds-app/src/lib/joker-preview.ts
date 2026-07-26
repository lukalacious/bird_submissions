/**
 * Calculate joker preview for selected birds before submission
 * Mirrors the server-side joker calculation logic
 */
import { calculateJokersFromGroup } from "@/lib/joker-groups";

interface Bird {
  fullName: string;
  groupName?: string | null;
}

interface JokerPreview {
  totalJokers: number;
  groupBreakdown: Array<{
    groupName: string;
    count: number;
    jokersEarned: number;
  }>;
}

/**
 * Calculate joker preview from selected bird names
 * @param selectedBirdNames - Array of selected bird full names
 * @param allBirds - Complete bird list with groupName data
 * @returns Joker preview with total and group breakdown
 */
export function calculateJokerPreview(
  selectedBirdNames: string[],
  allBirds: Bird[]
): JokerPreview {
  // Create a map of bird name to group
  const birdGroupMap = new Map<string, string>();
  for (const bird of allBirds) {
    if (bird.groupName) {
      birdGroupMap.set(bird.fullName, bird.groupName);
    }
  }

  // Count birds per group
  const groupCounts = new Map<string, number>();
  for (const birdName of selectedBirdNames) {
    const group = birdGroupMap.get(birdName);
    if (group) {
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    }
  }

  // Calculate jokers per group
  const groupBreakdown: JokerPreview["groupBreakdown"] = [];
  let totalJokers = 0;

  for (const [groupName, count] of groupCounts) {
    const jokersEarned = calculateJokersFromGroup(count);
    if (count >= 3) {
      groupBreakdown.push({
        groupName,
        count,
        jokersEarned,
      });
      totalJokers += jokersEarned;
    }
  }

  // Sort by jokers earned (descending)
  groupBreakdown.sort((a, b) => b.jokersEarned - a.jokersEarned);

  return {
    totalJokers,
    groupBreakdown,
  };
}

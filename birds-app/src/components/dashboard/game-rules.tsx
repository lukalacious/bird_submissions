"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface GameRulesProps {
  rules: string | null;
}

const DEFAULT_RULES = `**Monthly Goal:** Twitch the required number of birds each month to stay in the game.

**Bird Selection:** Choose birds from your selected region. Each bird can only be twitched once per period (monthly or yearly, depending on game settings).

**Earn Jokers:** Submit 3 or more birds from the same family in a single month to earn jokers. The more birds from a family, the more jokers you earn!

**Use Jokers:** Spend a joker to gain immunity for a month. This counts as 1 bird submission towards your monthly goal without actually twitching a bird.

**Elimination:** Fail to meet the minimum monthly threshold and you're eliminated from the competition for the year.

**Custom Birds:** Can't find your bird in the list? Add it as a custom entry and it will be reviewed by an admin.

**Regions:** You can twitch birds from different regions, each with its own unique bird list.`;

export function GameRules({ rules }: GameRulesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayRules = rules || DEFAULT_RULES;

  // Split rules into lines
  const ruleLines = displayRules.split('\n').filter(line => line.trim());

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>Game Rules</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 space-y-2">
          {ruleLines.map((line, index) => {
            // Check if line is a heading (starts with **)
            if (line.startsWith('**') && line.includes('**:')) {
              const [title, ...contentParts] = line.split('**:');
              const content = contentParts.join('**:');
              return (
                <div key={index} className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {title.replace(/\*\*/g, '')}:
                  </p>
                  <p className="text-sm text-muted-foreground pl-4">
                    {content.trim()}
                  </p>
                </div>
              );
            }
            // Regular text
            return (
              <p key={index} className="text-sm text-muted-foreground">
                {line}
              </p>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

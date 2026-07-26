import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export interface SpecialBirdStatus {
  name: string;
  ticked: boolean;
}

interface SpecialBirdsCardProps {
  monthName: string;
  goldenBirds: SpecialBirdStatus[];
  photoBirds: SpecialBirdStatus[];
}

function BirdRow({ bird }: { bird: SpecialBirdStatus }) {
  return (
    <li
      className={`flex items-center gap-2 text-sm ${
        bird.ticked ? "text-primary font-medium" : "text-foreground"
      }`}
    >
      {bird.ticked ? (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      ) : (
        <span className="h-4 w-4 flex-shrink-0 rounded-full border border-muted-foreground/30" />
      )}
      <span className="truncate">{bird.name}</span>
    </li>
  );
}

/** Shows the month's announced golden + photography birds (from admin settings). */
export function SpecialBirdsCard({ monthName, goldenBirds, photoBirds }: SpecialBirdsCardProps) {
  if (goldenBirds.length === 0 && photoBirds.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{monthName} Bonus Birds</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goldenBirds.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <span>🪙</span> Golden Birds
              </p>
              <ul className="space-y-1">
                {goldenBirds.map((b) => (
                  <BirdRow key={b.name} bird={b} />
                ))}
              </ul>
            </div>
          )}
          {photoBirds.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1">
                <span>📸</span> Photography Birds
              </p>
              <ul className="space-y-1">
                {photoBirds.map((b) => (
                  <BirdRow key={b.name} bird={b} />
                ))}
              </ul>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Golden birds and photographed photo birds earn bonus jokers via the monthly form.
        </p>
      </CardContent>
    </Card>
  );
}

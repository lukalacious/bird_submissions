"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Sparkles } from "lucide-react";
import {
  getMonthlySpecialBirds,
  updateMonthlySpecialBirds,
} from "@/app/actions/admin-actions";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface SpecialBirdsAdminProps {
  year: number;
}

/** Admin editor for the month's golden + photography birds (one name per line). */
export function SpecialBirdsAdmin({ year }: SpecialBirdsAdminProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [golden, setGolden] = useState("");
  const [photo, setPhoto] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsLoading(true);
    getMonthlySpecialBirds(year, month)
      .then((data) => {
        setGolden(data.goldenBirds.join("\n"));
        setPhoto(data.photoBirds.join("\n"));
      })
      .catch(() => toast.error("Failed to load bonus birds"))
      .finally(() => setIsLoading(false));
  }, [year, month]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateMonthlySpecialBirds({
        year,
        month,
        goldenBirds: golden.split("\n"),
        photoBirds: photo.split("\n"),
      });
      if (result.success) {
        if (result.unmatched && result.unmatched.length > 0) {
          toast.warning(
            `Saved, but these names don't match any bird (check spelling): ${result.unmatched.join(", ")}`,
            { duration: 8000 }
          );
        } else {
          toast.success(`${MONTH_NAMES[month - 1]} bonus birds saved`);
        }
      } else {
        toast.error(result.error || "Failed to save");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Monthly Bonus Birds
        </CardTitle>
        <CardDescription>
          Golden and photography birds announced for the month — shown on every
          player&apos;s dashboard and badged in the twitch list. One bird per line.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="special-month">Month</Label>
          <select
            id="special-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name} {year}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="golden-birds">🪙 Golden Birds</Label>
            <Textarea
              id="golden-birds"
              value={golden}
              onChange={(e) => setGolden(e.target.value)}
              placeholder={"Black-collared Barbet\nCollared Sunbird\n..."}
              rows={6}
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="photo-birds">📸 Photography Birds</Label>
            <Textarea
              id="photo-birds"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder={"Southern Fiscal\nMalachite Kingfisher\n..."}
              rows={6}
              disabled={isLoading}
              className="mt-1"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending || isLoading} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Saving..." : "Save Bonus Birds"}
        </Button>
      </CardContent>
    </Card>
  );
}

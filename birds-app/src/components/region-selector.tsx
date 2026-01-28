"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { updateUserProfile } from "@/app/actions/user-actions";
import { toast } from "sonner";

interface Region {
  id: string;
  name: string;
  label: string;
}

interface RegionSelectorProps {
  regions: Region[];
}

export function RegionSelector({ regions }: RegionSelectorProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedRegion = regions.find((r) => r.id === selectedRegionId);

  const handleContinue = () => {
    if (!selectedRegion) {
      toast.error("Please select a region");
      return;
    }

    startTransition(async () => {
      // Save as default region
      const result = await updateUserProfile({
        defaultRegionId: selectedRegionId,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save region");
        return;
      }

      // Navigate to twitch page with region
      router.push(`/twitch?region=${selectedRegion.name}`);
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Select Your Region</CardTitle>
          <CardDescription>
            Choose the region where you&apos;ll be twitching birds. This will be
            saved as your default for future visits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a region..." />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleContinue}
            disabled={!selectedRegionId || isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Continue to Twitch Birds
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You can change your default region anytime in your profile settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

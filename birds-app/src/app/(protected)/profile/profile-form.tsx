"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateUserProfile } from "@/app/actions/user-actions";
import { Check, Loader2 } from "lucide-react";

interface Region {
  id: string;
  name: string;
  label: string;
}

interface ProfileFormProps {
  currentUsername: string | null;
  currentName: string | null;
  currentRegionId: string | null;
  regions: Region[];
}

export function ProfileForm({
  currentUsername,
  currentName,
  currentRegionId,
  regions,
}: ProfileFormProps) {
  const [username, setUsername] = useState(currentUsername || "");
  const [name, setName] = useState(currentName || "");
  const [regionId, setRegionId] = useState(currentRegionId || "");
  const [isPending, startTransition] = useTransition();
  const { update } = useSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateUserProfile({
        name: name,
        username: username,
        defaultRegionId: regionId || null,
      });

      if (result.success) {
        toast.success("Profile updated successfully");
        // Update the session to reflect the new username
        await update();
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    });
  };

  const hasChanges =
    username !== (currentUsername || "") ||
    name !== (currentName || "") ||
    regionId !== (currentRegionId || "");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={50}
          disabled={isPending}
        />
        <p className="text-xs text-gray-500">
          Your display name (2-50 characters).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          maxLength={30}
          disabled={isPending}
        />
        <p className="text-xs text-gray-500">
          3-30 characters. Letters, numbers, underscores, and hyphens only.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="region">Default Region</Label>
        <Select
          value={regionId}
          onValueChange={setRegionId}
          disabled={isPending}
        >
          <SelectTrigger id="region">
            <SelectValue placeholder="Select your default region" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          This region will be pre-selected when you twitch birds.
        </p>
      </div>
      <Button type="submit" disabled={isPending || !hasChanges}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}

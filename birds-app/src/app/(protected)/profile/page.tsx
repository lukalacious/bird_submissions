import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getUserProfile } from "@/app/actions/user-actions";
import { ProfileForm } from "./profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Bird } from "lucide-react";
import { PushSubscribeButton } from "@/components/push-subscribe-button";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const profile = await getUserProfile();
  if (!profile) {
    redirect("/");
  }

  // Fetch all regions for the selector
  const regions = await prisma.region.findMany({
    select: {
      id: true,
      name: true,
      label: true,
    },
    orderBy: { label: "asc" },
  });

  const initials = profile.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const joinDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Profile Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.image || undefined} alt={profile.name || "User"} />
              <AvatarFallback className="bg-purple-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile.username || profile.name || "Anonymous"}
                </h2>
                {profile.username && profile.name && (
                  <p className="text-sm text-gray-500">{profile.name}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Mail className="h-3 w-3" />
                  {profile.email}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {joinDate}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Bird className="h-3 w-3" />
                  {profile._count.submissions} birds twitched
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your name, username, and default region. Your username is displayed on leaderboards and activity feeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            currentUsername={profile.username}
            currentName={profile.name}
            currentRegionId={profile.defaultRegionId}
            regions={regions}
          />
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            Get a push reminder 3 days before month end and when the month&apos;s
            bonus birds are announced. On iPhone, add the app to your home screen
            first (Share → Add to Home Screen).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushSubscribeButton />
        </CardContent>
      </Card>
    </div>
  );
}

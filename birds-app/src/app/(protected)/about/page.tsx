import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Bird, Github, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function AboutPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
          <Bird className="h-8 w-8 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">About Twitch</h1>
        <p className="text-sm text-gray-500 mt-1">Bird watching, gamified</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Twitch is a social bird watching app designed for friends and family
            who love spotting birds together. Log your sightings, compete in
            monthly challenges, and see what everyone else is twitching.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Whether you&apos;re a seasoned birder or just getting started, Twitch
            makes it fun to track your observations and stay connected with your
            bird-loving community.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Built by
          </h2>
          <Link
            href="https://github.com/lukalacious"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-3 -m-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Image
              src="https://github.com/lukalacious.png"
              alt="Luke Roberts"
              width={56}
              height={56}
              className="rounded-full ring-2 ring-gray-100"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Luke Roberts</p>
              <p className="text-sm text-gray-500">@lukalacious</p>
            </div>
            <Github className="h-5 w-5 text-gray-400" />
          </Link>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-1">
        Made with <Heart className="h-4 w-4 text-red-400 fill-red-400" /> for bird lovers
      </p>
    </div>
  );
}

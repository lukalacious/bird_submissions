import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Twitch: a bird a day",
    short_name: "Twitch",
    description: "The bird-a-day twitching challenge.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8f4",
    theme_color: "#f4f8f4",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

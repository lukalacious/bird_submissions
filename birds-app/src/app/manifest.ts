import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Twitch — Birding Challenge",
    short_name: "Twitch",
    description: "Monthly bird-watching challenge: twitch birds, earn jokers, stay alive.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#5b7ab8",
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

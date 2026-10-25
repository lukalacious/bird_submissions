import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { isStagingSite } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Twitch", template: "%s · Twitch" },
  description: "A bird a day, all year — the twitching challenge.",
  applicationName: "Twitch",
  appleWebApp: { capable: true, title: "Twitch", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "oklch(0.975 0.008 150)" },
    { media: "(prefers-color-scheme: dark)", color: "oklch(0.2 0.02 160)" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {isStagingSite && (
          <p className="bg-weaver px-4 py-1.5 text-center text-sm font-semibold text-weaver-ink">
            Test site: data resets every night. The real game is at bird-submissions.vercel.app
          </p>
        )}
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

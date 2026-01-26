import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

// Display font: Fraunces - characterful serif for headings
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Body font: Source Sans 3 - excellent readability
const sourceSans = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Mono font: Keep Geist Mono for code
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Twitch",
  description: "Track the birds you've spotted across different regions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${sourceSans.variable} ${geistMono.variable} font-body antialiased`}
      >
        <SessionProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}

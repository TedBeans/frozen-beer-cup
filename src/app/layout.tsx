import type { Metadata, Viewport } from "next";
import "@fontsource/big-shoulders-display/600";
import "@fontsource/big-shoulders-display/800";
import "@fontsource-variable/public-sans";
import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = {
  title: "Frozen Beer Cup",
  description: "Live scoring, leaderboard and stats for the Frozen Beer Cup golf scramble.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10283a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}

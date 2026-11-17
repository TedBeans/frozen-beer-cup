import type { Metadata, Viewport } from "next";
import "@fontsource/big-shoulders-display/600";
import "@fontsource/big-shoulders-display/800";
import "@fontsource-variable/public-sans";
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/work-sans";
import "@fontsource-variable/archivo";
import "@fontsource/alfa-slab-one";
import "@fontsource/archivo-black";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('fbc-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";

/**
 * Chrome per screen: the clubhouse board runs edge to edge with no navigation,
 * the scoring screen drops the tab bar (it has its own standings bar), and
 * everything else gets the phone column plus tabs.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/board")) return <div className="min-h-dvh">{children}</div>;
  const scoring = path.startsWith("/score");
  return (
    <>
      <div className={`mx-auto w-full max-w-2xl px-4 pt-6 ${scoring ? "pb-32" : "pb-28"}`}>{children}</div>
      {scoring ? null : <BottomNav />}
    </>
  );
}

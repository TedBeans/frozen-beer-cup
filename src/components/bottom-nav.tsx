"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Feed", icon: "M7 4h10v4a5 5 0 0 1-10 0V4Zm-3 1h3m10 0h3M9 20h6m-3-7v7" },
  { href: "/card", label: "Cards", icon: "M4 5h16v14H4V5Zm0 5h16M4 14h16M9 5v14M15 5v14" },
  { href: "/holes", label: "Holes", icon: "M8 21V4m0 0 9 3.5L8 11M5 21h6" },
  { href: "/stats", label: "Stats", icon: "M5 20V10m5 10V5m5 15v-8m5 8v-5" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rime bg-glass/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.4 : 1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={t.icon} />
                </svg>
                {t.label}
                <span
                  className={`mt-0.5 h-1 w-6 rounded-full ${active ? "bg-amber" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

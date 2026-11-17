"use client";

import { useState, useSyncExternalStore } from "react";

export const THEMES = [
  { id: "frost", name: "Original", note: "Icy blue, tall condensed type", swatch: ["#e9f1f3", "#10283a", "#c97b0a", "#2b78a6"] },
  { id: "tournament", name: "Tournament", note: "Major-championship scoreboard: white, deep green, gold, serif", swatch: ["#f1f5ef", "#0b3d2a", "#c8a227", "#2f7d32"] },
  { id: "night", name: "Night Round", note: "Dark, glowing numbers for evening play", swatch: ["#0a1020", "#e9effa", "#ffb547", "#4cc9f0"] },
  { id: "pop", name: "Mini Golf Pop", note: "Bright, rounded and loud", swatch: ["#f1ecff", "#20124d", "#f72585", "#3a86ff"] },
  { id: "stout", name: "Stout", note: "Beer-label brown and foam gold, slab type", swatch: ["#1b120c", "#f6e7c8", "#f2b134", "#9ccc5a"] },
  { id: "swiss", name: "Swiss Print", note: "Stark black, white and one red, sharp corners", swatch: ["#f2f2ef", "#0a0a0a", "#e4002b", "#1d4ed8"] },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];
const KEY = "fbc-theme";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function current(): ThemeId {
  const t = document.documentElement.dataset.theme as ThemeId | undefined;
  return THEMES.some((x) => x.id === t) ? (t as ThemeId) : "frost";
}

function apply(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  listeners.forEach((l) => l());
}

/** Temporary design switcher so the group can try each look. Remove once one is picked. */
export function ThemePicker() {
  const theme = useSyncExternalStore(subscribe, current, () => "frost" as ThemeId);
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed right-3 top-3 z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="theme-list"
        className="press flex items-center gap-2 rounded-full border border-rime bg-glass px-3.5 py-2 text-sm font-semibold text-ink shadow-sm"
      >
        <span aria-hidden="true" className="flex -space-x-1">
          {THEMES.find((t) => t.id === theme)!.swatch.slice(1).map((c) => (
            <span key={c} className="h-3.5 w-3.5 rounded-full border border-rime" style={{ background: c }} />
          ))}
        </span>
        Theme
      </button>
      {open ? (
        <ul id="theme-list" className="mt-2 w-72 max-w-[calc(100vw-1.5rem)] space-y-1.5 rounded-2xl border border-rime bg-glass p-2 shadow-lg">
          {THEMES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  apply(t.id);
                  setOpen(false);
                }}
                aria-pressed={t.id === theme}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left ${
                  t.id === theme ? "border-ink" : "border-transparent"
                }`}
              >
                <span aria-hidden="true" className="grid h-10 w-14 shrink-0 grid-cols-4 overflow-hidden rounded-md border border-rime">
                  {t.swatch.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">{t.name}</span>
                  <span className="block text-xs leading-snug text-muted">{t.note}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

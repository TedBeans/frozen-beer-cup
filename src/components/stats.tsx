"use client";

import Link from "next/link";
import { useState } from "react";
import { getCourse } from "@/lib/course";
import { playerNames } from "@/lib/format";
import {
  champion,
  computeLeaderboard,
  contributions,
  formatToPar,
  holeAverages,
  resultCounts,
} from "@/lib/scoring";
import type { EventState } from "@/lib/types";
import { useHistory } from "@/lib/use-history";
import { SetupNotice } from "./page-header";

export function Stats({
  initial,
  initialError,
}: {
  initial: EventState[];
  initialError: string | null;
}) {
  const { states, error } = useHistory(initial);
  const [year, setYear] = useState<number | null>(null);
  const [scope, setScope] = useState<"year" | "all">("year");

  if (states.length === 0) return <SetupNotice error={error ?? initialError} />;

  const selected = states.find((s) => s.event.year === year) ?? states[0];
  const course = getCourse(selected.event.courseKey);
  const board = computeLeaderboard(selected);
  const names = playerNames(selected.roster);
  const contrib = contributions(selected);
  const holeStats = holeAverages(scope === "year" ? [selected] : states, course)
    .filter((h) => h.avgToPar !== null)
    .sort((a, b) => (b.avgToPar ?? 0) - (a.avgToPar ?? 0));
  const maxAbs = Math.max(0.5, ...holeStats.map((h) => Math.abs(h.avgToPar ?? 0)));

  return (
    <>
      <header className="mb-5">
        <h1 className="font-display text-5xl font-extrabold leading-[0.95]">Stats</h1>
        {error ? <p className="mt-1.5 text-sm font-semibold text-flag">Offline, showing the last stats.</p> : null}
      </header>

      {states.length > 1 ? (
        <div role="group" aria-label="Year" className="mb-4 flex flex-wrap gap-2">
          {states.map((s) => (
            <button
              key={s.event.year}
              type="button"
              aria-pressed={s.event.year === selected.event.year}
              onClick={() => setYear(s.event.year)}
              className={`num rounded-full border-2 px-4 py-1.5 text-xl ${
                s.event.year === selected.event.year ? "border-ink bg-ink text-frost" : "border-rime"
              }`}
            >
              {s.event.year}
            </button>
          ))}
        </div>
      ) : null}

      <section aria-labelledby="teams-h" className="mb-8">
        <h2 id="teams-h" className="font-display text-3xl font-extrabold">
          {selected.event.year} teams
        </h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-rime bg-glass">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rime text-left text-xs text-muted">
                {["Team", "To par", "Thru", "Birdie+", "Par", "Bogey", "Double+"].map((h) => (
                  <th key={h} scope="col" className="px-2 py-2 font-semibold first:pl-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.map((r) => {
                const c = resultCounts(r);
                return (
                  <tr key={r.team.id} className="border-b border-rime last:border-0">
                    <th scope="row" className="py-2 pl-3 pr-1 text-left">
                      <span
                        className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ background: r.team.color }}
                        aria-hidden="true"
                      />
                      {r.team.name}
                    </th>
                    <td className="num px-2 py-2 text-lg">{r.thru ? formatToPar(r.toPar) : "–"}</td>
                    <td className="px-2 py-2">{r.thru}</td>
                    <td className="px-2 py-2">{c.eagle + c.birdie}</td>
                    <td className="px-2 py-2">{c.par}</td>
                    <td className="px-2 py-2">{c.bogey}</td>
                    <td className="px-2 py-2">{c.double}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="carry-h" className="mb-8">
        <h2 id="carry-h" className="font-display text-3xl font-extrabold">
          Who carried the scramble
        </h2>
        <p className="mt-1 text-sm text-muted">
          How many holes used each player&apos;s drive and made the final putt. Only counts holes where
          the scorer tapped a name.
        </p>
        <div className="mt-3 space-y-3">
          {board.map((r) => {
            const mine = contrib.filter((c) => c.teamId === r.team.id);
            return (
              <div key={r.team.id} className="rounded-2xl border border-rime bg-glass p-4">
                <h3 className="font-display text-2xl font-extrabold" style={{ color: r.team.color }}>
                  {r.team.name}
                </h3>
                <ul className="mt-2 space-y-2.5">
                  {mine.map((c) => (
                    <li key={c.playerId}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold">{names.get(c.playerId)}</span>
                        <span className="text-muted">
                          {c.drives} {c.drives === 1 ? "drive" : "drives"}, {c.putts}{" "}
                          {c.putts === 1 ? "putt" : "putts"}
                        </span>
                      </div>
                      <Bar value={c.drives} total={Math.max(1, r.thru)} color={r.team.color} />
                      <Bar value={c.putts} total={Math.max(1, r.thru)} color="#9db1bd" />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="holes-h" className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="holes-h" className="font-display text-3xl font-extrabold">
            Hardest holes
          </h2>
          {states.length > 1 ? (
            <div role="group" aria-label="Hole stats range" className="flex gap-2">
              {(["year", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={scope === s}
                  onClick={() => setScope(s)}
                  className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${
                    scope === s ? "border-ink bg-ink text-frost" : "border-rime"
                  }`}
                >
                  {s === "year" ? selected.event.year : "All years"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">Average team score against par, worst first.</p>
        {holeStats.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-rime bg-glass p-4 text-sm text-muted">
            No holes scored yet. This fills in as teams post scores.
          </p>
        ) : (
          <ul className="mt-3 overflow-hidden rounded-2xl border border-rime bg-glass">
            {holeStats.map((h) => {
              const v = h.avgToPar ?? 0;
              return (
                <li key={h.hole} className="flex items-center gap-3 border-b border-rime px-3 py-2 last:border-0">
                  <span className="num w-8 text-2xl">{h.hole}</span>
                  <span className="w-12 text-xs text-muted">Par {h.par}</span>
                  <span className="relative h-3 flex-1 rounded-full bg-frost" aria-hidden="true">
                    <span
                      className="absolute top-0 h-3 rounded-full"
                      style={{
                        left: v >= 0 ? "50%" : `${50 - (Math.abs(v) / maxAbs) * 50}%`,
                        width: `${(Math.abs(v) / maxAbs) * 50}%`,
                        background: v > 0 ? "var(--color-ink)" : "var(--color-flag)",
                      }}
                    />
                  </span>
                  <span className="num w-14 text-right text-xl">
                    {v > 0 ? "+" : v < 0 ? "−" : ""}
                    {Math.abs(v).toFixed(1)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <History states={states} />

      <p className="text-sm text-muted">
        <Link href="/admin" className="font-semibold text-ink underline underline-offset-2">
          Admin: teams, handicaps and new years
        </Link>
      </p>
    </>
  );
}

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  return (
    <div className="mt-1 h-2 rounded-full bg-frost" aria-hidden="true">
      <div
        className="h-2 rounded-full"
        style={{ width: `${Math.min(100, (value / total) * 100)}%`, background: color }}
      />
    </div>
  );
}

type Career = {
  name: string;
  years: number;
  cups: number;
  drives: number;
  putts: number;
};

function History({ states }: { states: EventState[] }) {
  const winners = states.map((s) => ({ s, w: champion(s) }));
  const careers = new Map<number, Career>();
  for (const { s, w } of winners) {
    for (const p of s.roster) {
      const c =
        careers.get(p.playerId) ?? { name: p.name, years: 0, cups: 0, drives: 0, putts: 0 };
      c.years += 1;
      if (w && p.teamId === w.team.id) c.cups += 1;
      c.drives += s.scores.filter((x) => x.drivePlayerId === p.playerId).length;
      c.putts += s.scores.filter((x) => x.puttPlayerId === p.playerId).length;
      careers.set(p.playerId, c);
    }
  }
  const rows = [...careers.values()].sort((a, b) => b.cups - a.cups || b.years - a.years || a.name.localeCompare(b.name));

  return (
    <section aria-labelledby="hist-h" className="mb-8">
      <h2 id="hist-h" className="font-display text-3xl font-extrabold">
        Cup history
      </h2>
      <div className="mt-2 overflow-hidden rounded-2xl border border-rime bg-glass">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rime text-left text-xs text-muted">
              <th scope="col" className="px-3 py-2 font-semibold">Year</th>
              <th scope="col" className="px-3 py-2 font-semibold">Champion</th>
              <th scope="col" className="px-3 py-2 font-semibold">To par</th>
            </tr>
          </thead>
          <tbody>
            {winners.map(({ s, w }) => {
              const board = computeLeaderboard(s);
              const names = playerNames(s.roster);
              const started = board.some((r) => r.thru > 0);
              return (
                <tr key={s.event.year} className="border-b border-rime last:border-0">
                  <th scope="row" className="num px-3 py-2 text-left text-xl">{s.event.year}</th>
                  <td className="px-3 py-2">
                    {w ? (
                      <>
                        <span className="font-semibold" style={{ color: w.team.color }}>
                          {w.team.name}
                        </span>
                        <span className="block text-xs text-muted">
                          {w.players.map((p) => names.get(p.playerId)).join(", ")}
                        </span>
                      </>
                    ) : started ? (
                      "In progress"
                    ) : (
                      "Not played yet"
                    )}
                  </td>
                  <td className="num px-3 py-2 text-xl">{w ? formatToPar(w.toPar) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 font-display text-2xl font-extrabold">Players, all years</h3>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-rime bg-glass">
        <table className="w-full min-w-[22rem] text-sm">
          <thead>
            <tr className="border-b border-rime text-left text-xs text-muted">
              <th scope="col" className="px-3 py-2 font-semibold">Player</th>
              <th scope="col" className="px-3 py-2 font-semibold">Cups</th>
              <th scope="col" className="px-3 py-2 font-semibold">Years</th>
              <th scope="col" className="px-3 py-2 font-semibold">Drives used</th>
              <th scope="col" className="px-3 py-2 font-semibold">Putts made</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name} className="border-b border-rime last:border-0">
                <th scope="row" className="px-3 py-2 text-left font-semibold">{c.name}</th>
                <td className="num px-3 py-2 text-lg">{c.cups}</td>
                <td className="px-3 py-2">{c.years}</td>
                <td className="px-3 py-2">{c.drives}</td>
                <td className="px-3 py-2">{c.putts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

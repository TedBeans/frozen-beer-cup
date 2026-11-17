"use client";

import Link from "next/link";
import { getCourse } from "@/lib/course";
import { champion, computeLeaderboard, formatToPar } from "@/lib/scoring";
import { currentHole, holeLines, moments, race } from "@/lib/round";
import { useEventState } from "@/lib/use-event-state";
import type { EventState } from "@/lib/types";
import { HoleMap } from "./hole-map";
import { Logo } from "./logo";
import { LoadingNote, SetupNotice } from "./page-header";
import { RoundTrace } from "./round-trace";

/** Clubhouse screen: open it on a laptop or TV. Big numbers, a race chart, the hole in play. */
export function Board({ initial, initialError }: { initial: EventState | null; initialError: string | null }) {
  const { state, error } = useEventState(initial, { intervalMs: 5000 });
  if (!state) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        {error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />}
      </div>
    );
  }
  const course = getCourse(state.event.courseKey);
  const board = computeLeaderboard(state);
  const lines = holeLines(state);
  const next = currentHole(lines);
  const allDone = lines.every((l) => l.done);
  const winner = champion(state);
  const feed = moments(lines, 8);
  const maxThru = Math.max(0, ...board.map((r) => r.thru));

  return (
    <div className="flex min-h-dvh flex-col bg-frost">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-amber bg-ink px-6 py-3 text-frost">
        <div className="flex items-center gap-4">
          <Logo size={64} />
          <h1 className="font-display text-5xl font-extrabold">{state.event.title}</h1>
        </div>
        <p className="text-base">
          {error ? "Offline, retrying" : allDone ? "Final" : `Live · thru ${maxThru} · next up: hole ${next}, par ${course.holes[next - 1].par}`}
        </p>
      </header>

      {winner ? (
        <p className="bg-amber px-6 py-3 font-display text-3xl font-extrabold text-ink">
          {winner.team.name} wins the {state.event.year} Cup at {formatToPar(winner.toPar)}.
        </p>
      ) : null}

      <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[1.1fr_1fr]">
        <ol className="flex flex-col gap-3">
          {board.map((r) => (
            <li
              key={r.team.id}
              className="flex flex-1 items-center gap-4 rounded-2xl border border-rime bg-glass px-5 py-3"
              style={{ borderLeft: `12px solid ${r.team.color}` }}
            >
              <span className="num w-10 text-4xl text-muted">{r.rank ? `${r.tied ? "T" : ""}${r.rank}` : "–"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-5xl font-extrabold leading-none">{r.team.name}</p>
                <p className="mt-1 truncate text-sm text-muted">
                  {r.players.map((p) => p.name.trim()).join(", ")} &middot;{" "}
                  {r.thru === 0 ? "Not started" : r.finished ? "Finished" : `Thru ${r.thru}`}
                </p>
                <div className="max-w-md">
                  <RoundTrace holes={r.holes} color={r.team.color} />
                </div>
              </div>
              <span className="num text-[clamp(4rem,9vw,8rem)] leading-[0.8]" style={{ color: r.thru > 0 && r.toPar < 0 ? "var(--color-flag)" : undefined }}>
                {r.thru > 0 ? formatToPar(r.toPar) : "–"}
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-rime bg-glass p-3">
            <h2 className="text-sm font-bold">Score to par, hole by hole</h2>
            <RaceChart state={state} />
          </section>
          <section className="relative overflow-hidden rounded-2xl border border-rime bg-glass">
            <HoleMap hole={course.holes[(allDone ? 18 : next) - 1]} replayKey={allDone ? 18 : next} maxHeight="38dvh" />
            <p className="absolute left-3 top-3 rounded-lg bg-ink/90 px-3 py-1 text-sm font-bold text-frost">
              Hole {allDone ? 18 : next} &middot; par {course.holes[(allDone ? 18 : next) - 1].par} &middot; {course.holes[(allDone ? 18 : next) - 1].yards}
            </p>
          </section>
        </div>
      </main>

      <footer className="flex items-center gap-6 overflow-hidden whitespace-nowrap border-t border-rime bg-glass px-6 py-2.5 text-sm">
        <b>Latest</b>
        {feed.length === 0 ? <span className="text-muted">Waiting on the first hole.</span> : null}
        {feed.map((m, i) => (
          <span key={i}>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.team.color }} aria-hidden="true" />
            {m.team.name} {m.label.toLowerCase()} on {m.hole}
          </span>
        ))}
        <Link href="/?watch" className="ml-auto font-semibold underline underline-offset-2">
          Phone view
        </Link>
      </footer>
    </div>
  );
}

function RaceChart({ state }: { state: EventState }) {
  const series = race(state);
  const all = series.flatMap((s) => s.points.map((p) => p.toPar));
  const lo = Math.min(-2, ...all);
  const hi = Math.max(2, ...all);
  const W = 520;
  const H = 210;
  const L = 34;
  const x = (hole: number) => L + ((hole - 1) / 17) * (W - L - 12);
  const y = (v: number) => 12 + ((hi - v) / (hi - lo)) * (H - 36);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => v % 2 === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="Running score to par for each team, hole by hole">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--color-ink)" : "var(--color-rime)"} strokeWidth={v === 0 ? 2 : 1} />
          <text x={4} y={y(v) + 4} fontSize="12" fill="var(--color-muted)">
            {formatToPar(v)}
          </text>
        </g>
      ))}
      {[1, 6, 12, 18].map((h) => (
        <text key={h} x={x(h)} y={H - 6} fontSize="12" textAnchor="middle" fill="var(--color-muted)">
          {h}
        </text>
      ))}
      {series.map((s) =>
        s.points.length ? (
          <g key={s.team.id}>
            <polyline fill="none" stroke={s.team.color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" points={s.points.map((p) => `${x(p.hole)},${y(p.toPar)}`).join(" ")} />
            <circle cx={x(s.points.at(-1)!.hole)} cy={y(s.points.at(-1)!.toPar)} r="6" fill={s.team.color} />
          </g>
        ) : null,
      )}
    </svg>
  );
}

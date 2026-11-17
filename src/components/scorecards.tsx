"use client";

import { computeLeaderboard, formatToPar, scoreKind, type HoleResult, type TeamResult } from "@/lib/scoring";
import { formatTime, playerNames } from "@/lib/format";
import { useEventState } from "@/lib/use-event-state";
import type { EventState } from "@/lib/types";
import { LoadingNote, PageHeader, SetupNotice } from "./page-header";

function ScoreMark({ h, blank }: { h: HoleResult; blank?: boolean }) {
  if (h.gross === null) return <span className="text-rime">·</span>;
  const kind = scoreKind(h.gross, h.par);
  const base = "inline-flex h-6 w-6 items-center justify-center text-sm font-bold";
  const red = "var(--color-flag)";
  const ink = "var(--color-ink)";
  const style =
    kind === "eagle"
      ? { border: `2px solid ${red}`, outline: `1.5px solid ${red}`, outlineOffset: 1, color: red }
      : kind === "birdie"
        ? { border: `2px solid ${red}`, color: red }
        : kind === "bogey"
          ? { border: `2px solid ${ink}` }
          : kind === "double"
            ? { border: `2px solid ${ink}`, outline: `1.5px solid ${ink}`, outlineOffset: 1 }
            : {};
  return (
    <span
      className={`${base} ${kind === "eagle" || kind === "birdie" ? "rounded-full" : kind === "par" ? "" : "rounded-[3px]"}`}
      style={style}
      aria-label={`${h.gross} on a par ${h.par}`}
    >
      {blank ? null : h.gross}
    </span>
  );
}

function Nine({ holes, label }: { holes: HoleResult[]; label: string }) {
  const played = holes.filter((h) => h.gross !== null);
  const gross = played.reduce((s, h) => s + (h.gross ?? 0), 0);
  const par = holes.reduce((s, h) => s + h.par, 0);
  const th = "px-0 py-1.5 text-center";
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="w-14 py-1.5 pl-3 text-left font-semibold">
              Hole
            </th>
            {holes.map((h) => (
              <th key={h.hole} scope="col" className={`${th} font-semibold text-ink`}>
                {h.hole}
              </th>
            ))}
            <th scope="col" className={`${th} w-12 font-semibold text-ink`}>
              {label}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-rime text-muted">
            <th scope="row" className="py-1.5 pl-3 text-left font-semibold">
              Par
            </th>
            {holes.map((h) => (
              <td key={h.hole} className={th}>
                {h.par}
              </td>
            ))}
            <td className={th}>{par}</td>
          </tr>
          <tr className="border-t border-rime">
            <th scope="row" className="py-2 pl-3 text-left font-semibold">
              Score
            </th>
            {holes.map((h) => (
              <td key={h.hole} className={th}>
                <ScoreMark h={h} />
              </td>
            ))}
            <td className={`${th} num text-xl`}>{played.length ? gross : "–"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TeamCard({ r, names }: { r: TeamResult; names: Map<number, string> }) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-rime bg-glass"
      style={{ borderTop: `8px solid ${r.team.color}` }}
    >
      <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-none">{r.team.name}</h2>
          <p className="mt-1 text-xs text-muted">
            {r.players.map((p) => names.get(p.playerId)).join(", ")}
          </p>
        </div>
        <p className="text-right text-sm">
          <span className="num text-3xl">{r.thru ? formatToPar(r.toPar) : "–"}</span>
          <span className="block text-xs text-muted">to par</span>
        </p>
      </div>
      <Nine holes={r.holes.slice(0, 9)} label="Out" />
      <div className="border-t-2 border-rime" />
      <Nine holes={r.holes.slice(9)} label="In" />
      <p className="border-t border-rime px-4 py-2 text-sm">
        <span className="font-semibold">Total</span>{" "}
        {r.thru ? (
          <>
            {r.gross} strokes ({formatToPar(r.toPar)})
          </>
        ) : (
          "No holes played yet"
        )}
      </p>
    </section>
  );
}

export function Scorecards({
  initial,
  initialError,
}: {
  initial: EventState | null;
  initialError: string | null;
}) {
  const { state, error, updatedAt } = useEventState(initial);
  if (!state) {
    return error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />;
  }
  const board = computeLeaderboard(state);
  const names = playerNames(state.roster);
  // Keep scorecards in team order so they don't jump around as the leaderboard changes.
  const ordered = [...board].sort((a, b) => a.team.position - b.team.position);
  return (
    <>
      <PageHeader
        state={state}
        title="Scorecards"
        note={error ? "Offline, retrying." : updatedAt ? `Updated ${formatTime(updatedAt)}` : null}
      />
      <div className="space-y-4">
        {ordered.map((r) => (
          <TeamCard key={r.team.id} r={r} names={names} />
        ))}
      </div>
      <ul aria-label="Score symbols" className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
        {[
          ["Eagle", 2],
          ["Birdie", 3],
          ["Bogey", 5],
          ["Double+", 6],
        ].map(([label, gross]) => (
          <li key={label} className="flex items-center gap-1.5">
            <ScoreMark h={{ hole: 0, par: 4, yards: 0, si: 0, gross: gross as number, drivePlayerId: null, puttPlayerId: null }} blank />
            {label}
          </li>
        ))}
      </ul>
    </>
  );
}

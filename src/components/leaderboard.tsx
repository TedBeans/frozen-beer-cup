"use client";

import Link from "next/link";
import { champion, computeLeaderboard, formatToPar } from "@/lib/scoring";
import { playerNames, formatTime } from "@/lib/format";
import { useEventState } from "@/lib/use-event-state";
import type { EventState } from "@/lib/types";
import { LoadingNote, PageHeader, SetupNotice } from "./page-header";
import { RoundTrace } from "./round-trace";

export function Leaderboard({
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
  const winner = champion(state);
  const anyPlayed = board.some((r) => r.thru > 0);

  return (
    <>
      <PageHeader
        state={state}
        note={
          error ? (
            <span className="font-semibold text-flag">Offline, retrying. Showing the last scores.</span>
          ) : updatedAt ? (
            <>Updated {formatTime(updatedAt)}</>
          ) : null
        }
      />

      {winner ? (
        <p className="mb-4 rounded-xl bg-ink px-4 py-3 font-display text-2xl font-extrabold text-frost">
          {winner.team.name} wins the {state.event.year} Cup at {formatToPar(winner.toPar)}.
        </p>
      ) : null}

      <ol className="space-y-3">
        {board.map((r) => (
          <li
            key={r.team.id}
            className="overflow-hidden rounded-2xl border border-rime bg-glass"
            style={{ borderLeft: `8px solid ${r.team.color}` }}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="num text-xl text-muted" aria-label={r.rank ? `Place ${r.rank}` : "Not started"}>
                    {r.rank ? `${r.tied ? "T" : ""}${r.rank}` : "–"}
                  </span>
                  <h2 className="truncate font-display text-3xl font-extrabold leading-none">
                    {r.team.name}
                  </h2>
                </div>
                <p className="mt-1.5 text-sm text-muted">
                  {r.players.map((p) => names.get(p.playerId)).join(", ") || "No players yet"}
                </p>
              </div>
              <div className="text-right">
                <div
                  className="num text-[5.5rem] leading-[0.8]"
                  style={{ color: r.thru > 0 && r.toPar < 0 ? r.team.color : undefined }}
                  aria-label={r.thru ? `${formatToPar(r.toPar)} to par` : "No score yet"}
                >
                  {r.thru > 0 ? formatToPar(r.toPar) : "–"}
                </div>
                <div className="mt-1.5 text-xs font-semibold text-muted">
                  {r.thru === 0 ? "Not started" : r.finished ? "Finished" : `Thru ${r.thru}`}
                </div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <RoundTrace holes={r.holes} color={r.team.color} />
              <p className="mt-2 text-xs text-muted">
                {r.thru > 0 ? `${r.gross} strokes through ${r.thru}.` : "Waiting on the first hole."}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-sm text-muted">
        {anyPlayed
          ? "Ranked by score to par. No handicap strokes. In the trace, bars above the line beat par on that hole."
          : "Scores appear here as teams finish holes."}{" "}
        <Link href="/card" className="font-semibold text-ink underline underline-offset-2">
          See full scorecards
        </Link>
      </p>
    </>
  );
}

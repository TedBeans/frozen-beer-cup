"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCourse } from "@/lib/course";
import { champion, computeLeaderboard, formatToPar } from "@/lib/scoring";
import { currentHole, holeLines, type HoleLine } from "@/lib/round";
import { formatTime } from "@/lib/format";
import { useEventState } from "@/lib/use-event-state";
import type { EventState } from "@/lib/types";
import { HoleMap } from "./hole-map";
import { LoadingNote, PageHeader, SetupNotice } from "./page-header";
import { ScoreMark } from "./score-mark";
import { StandingsStrip } from "./standings-strip";

/**
 * Home: a phone that has already picked a team jumps straight to scoring (once per visit).
 * Everyone else gets the feed. "?watch" always stays on the feed.
 */
function useScorerRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).has("watch")) return;
      if (sessionStorage.getItem("fbc-landed")) return;
      sessionStorage.setItem("fbc-landed", "1");
      if (localStorage.getItem("fbc-team")) router.replace("/score");
    } catch {}
  }, [router]);
}

export function Feed({ initial, initialError }: { initial: EventState | null; initialError: string | null }) {
  useScorerRedirect();
  const { state, error, updatedAt } = useEventState(initial);
  if (!state) {
    return error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />;
  }

  const course = getCourse(state.event.courseKey);
  const board = computeLeaderboard(state);
  const lines = holeLines(state);
  const winner = champion(state);
  const next = currentHole(lines);
  const allDone = lines.every((l) => l.done);
  const nextLine = lines[next - 1];
  const waiting = nextLine.cells.filter((c) => c.gross === null).map((c) => c.team);
  const played = lines.filter((l) => l.cells.some((c) => c.gross !== null)).reverse();

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-rime bg-frost/95 px-4 pb-3 pt-14 backdrop-blur">
        <StandingsStrip board={board} />
      </div>

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

      {!allDone ? (
        <Link
          href={`/holes/${next}`}
          className="mb-3 block rounded-2xl border-2 border-dashed border-ink px-4 py-3"
        >
          <p className="text-sm font-bold">
            Up next: Hole {next}{" "}
            <span className="font-normal text-muted">
              &middot; par {course.holes[next - 1].par} &middot; {course.holes[next - 1].yards} yards
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {waiting.length === state.teams.length ? "Nobody has posted yet." : `Waiting on ${waiting.map((t) => t.name).join(", ")}.`}
          </p>
        </Link>
      ) : null}

      <ol className="space-y-2.5">
        {played.map((l) => (
          <li key={l.hole}>
            <HoleCard line={l} course={course} />
          </li>
        ))}
      </ol>
      {played.length === 0 ? (
        <p className="rounded-2xl border border-rime bg-glass p-5 text-sm text-muted">
          Scores show up here hole by hole as teams post them.
        </p>
      ) : null}

      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/card" className="font-semibold underline underline-offset-2">
          Full scorecards
        </Link>
        <Link href="/board" className="font-semibold underline underline-offset-2">
          Big-screen board
        </Link>
      </p>
      <p className="mt-2 text-xs text-muted">
        Ranked by score to par. No handicap strokes. A dark badge marks the best score on a hole.
      </p>

      {!allDone ? (
        <Link
          href="/score"
          className="press fixed bottom-24 right-4 z-20 flex h-14 items-center rounded-full bg-ink px-6 text-base font-bold text-frost shadow-lg"
        >
          + Score hole {next}
        </Link>
      ) : null}
    </>
  );
}

export function HoleCard({ line, course }: { line: HoleLine; course: ReturnType<typeof getCourse> }) {
  return (
    <Link
      href={`/holes/${line.hole}`}
      className="press flex gap-3 rounded-2xl border border-rime bg-glass p-3"
    >
      <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl">
        <HoleMap hole={course.holes[line.hole - 1]} replayKey={line.hole} compact maxHeight="88px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-extrabold leading-none">Hole {line.hole}</h2>
          <span className="text-xs text-muted">
            Par {line.par} &middot; {line.yards}
          </span>
        </div>
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {line.cells.map((c) => {
            const best = c.team.id === line.winnerId;
            return (
              <li
                key={c.team.id}
                className={`flex items-center gap-1.5 rounded-lg py-0.5 pl-2 pr-1 ${best ? "bg-ink text-frost" : "bg-frost"}`}
              >
                <i className="h-2.5 w-2.5 rounded-full border border-white" style={{ background: c.team.color }} aria-hidden="true" />
                <span className="sr-only">{c.team.name}</span>
                {c.gross === null ? (
                  <span className="num w-[34px] text-center text-xl text-muted">–</span>
                ) : best ? (
                  <span className="num w-[34px] text-center text-xl">{c.gross}</span>
                ) : (
                  <ScoreMark gross={c.gross} par={line.par} color={c.team.color} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Link>
  );
}

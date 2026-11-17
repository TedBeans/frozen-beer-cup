"use client";

import Link from "next/link";
import { useState } from "react";
import { getCourse } from "@/lib/course";
import { holeLines } from "@/lib/round";
import { scoreName } from "@/lib/scoring";
import { useEventState } from "@/lib/use-event-state";
import type { EventState } from "@/lib/types";
import { HoleMap } from "./hole-map";
import { LoadingNote, SetupNotice } from "./page-header";
import { ScoreMark } from "./score-mark";

export function HoleDetail({ hole, initial, initialError }: { hole: number; initial: EventState | null; initialError: string | null }) {
  const { state, error } = useEventState(initial);
  const [replay, setReplay] = useState(0);
  if (!state) {
    return error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />;
  }
  const course = getCourse(state.event.courseKey);
  const h = course.holes[hole - 1];
  const line = holeLines(state)[hole - 1];

  return (
    <>
      <nav className="mb-3 flex items-center justify-between text-sm font-semibold">
        <Link href="/" className="underline underline-offset-2">
          &larr; Feed
        </Link>
        <span className="flex gap-4">
          {hole > 1 ? (
            <Link href={`/holes/${hole - 1}`} className="underline underline-offset-2">
              Hole {hole - 1}
            </Link>
          ) : null}
          {hole < 18 ? (
            <Link href={`/holes/${hole + 1}`} className="underline underline-offset-2">
              Hole {hole + 1}
            </Link>
          ) : null}
        </span>
      </nav>

      <section className="overflow-hidden rounded-2xl border border-rime bg-glass">
        <HoleMap hole={h} replayKey={hole * 1000 + replay} maxHeight="56dvh" />
        <div className="flex items-end justify-between gap-3 p-4">
          <h1 className="font-display text-5xl font-extrabold leading-none">Hole {hole}</h1>
          <p className="text-right text-sm text-muted">
            Par {h.par} &middot; {h.yards} yards
            <br />
            Stroke index {h.si}
          </p>
        </div>
        <div className="px-4 pb-4">
          <button type="button" onClick={() => setReplay((r) => r + 1)} className="press rounded-lg border border-ink px-3 py-1.5 text-sm font-bold">
            Replay
          </button>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="font-display text-3xl font-extrabold">Results</h2>
        <ul className="mt-2 space-y-2">
          {line.cells.map((c) => (
            <li
              key={c.team.id}
              className="flex items-center gap-3 rounded-2xl border border-rime bg-glass p-3"
              style={{ borderLeft: `7px solid ${c.team.color}` }}
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-extrabold leading-none">{c.team.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {c.gross === null
                    ? "Not posted yet"
                    : [c.drive ? `Drive: ${c.drive}` : null, c.putt ? `Putt: ${c.putt}` : null].filter(Boolean).join(" · ") || scoreName(c.gross, h.par)}
                </p>
              </div>
              {c.gross !== null ? (
                <>
                  <span className="text-sm text-muted">{scoreName(c.gross, h.par)}</span>
                  <ScoreMark gross={c.gross} par={h.par} color={c.team.color} size={40} />
                </>
              ) : (
                <span className="num text-2xl text-muted">–</span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-4 text-sm">
        <Link href="/holes" className="font-semibold underline underline-offset-2">
          Browse all holes
        </Link>
      </p>
    </>
  );
}

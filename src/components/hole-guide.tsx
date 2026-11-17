"use client";

import { useState } from "react";
import { CRYSTAL_SPRINGS_GOLD as course, coursePar } from "@/lib/course";
import { HoleMap } from "./hole-map";

export function HoleGuide() {
  const [n, setN] = useState(1);
  const [replay, setReplay] = useState(0);
  const hole = course.holes[n - 1];
  const front = course.holes.slice(0, 9);
  const back = course.holes.slice(9);
  const sum = (hs: typeof front, k: "par" | "yards") => hs.reduce((s, h) => s + h[k], 0);

  return (
    <>
      <header className="mb-4">
        <h1 className="font-display text-5xl font-extrabold leading-[0.95]">Hole guide</h1>
        <p className="mt-1.5 text-sm text-muted">
          {course.name}, {course.tee} tees. Par {coursePar(course)}, {sum(course.holes, "yards").toLocaleString("en-US")} yards,{" "}
          {course.slope} slope, {course.rating} rating.
        </p>
      </header>

      <nav aria-label="Holes" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {course.holes.map((h) => (
          <button
            key={h.n}
            type="button"
            onClick={() => {
              setN(h.n);
              setReplay((r) => r + 1);
            }}
            aria-current={h.n === n ? "true" : undefined}
            className={`num h-11 w-11 shrink-0 rounded-lg border-2 text-xl ${
              h.n === n ? "border-ink bg-ink text-frost" : "border-rime text-muted"
            }`}
          >
            {h.n}
          </button>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-rime bg-glass">
        <div className="flex items-end justify-between gap-3 p-4">
          <h2 className="font-display text-5xl font-extrabold leading-none">Hole {hole.n}</h2>
          <dl className="flex gap-4 text-center">
            {[
              ["Par", hole.par],
              ["Yards", hole.yards],
              ["Stroke index", hole.si],
            ].map(([k, v]) => (
              <div key={k}>
                <dd className="num text-3xl leading-none">{v}</dd>
                <dt className="mt-1 text-xs text-muted">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        <HoleMap hole={hole} replayKey={n * 1000 + replay} />
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <p className="text-xs text-muted">
            Drawn from satellite views of the course. Shot distances split the {hole.yards} yards along the line of play.
          </p>
          <button
            type="button"
            onClick={() => setReplay((r) => r + 1)}
            className="press shrink-0 rounded-lg border border-ink px-3 py-1.5 text-sm font-bold"
          >
            Replay
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-3xl font-extrabold">Scorecard</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-rime bg-glass">
          <table className="w-full min-w-[22rem] text-sm">
            <thead>
              <tr className="border-b border-rime text-left text-xs text-muted">
                <th className="px-3 py-2 font-semibold">Hole</th>
                <th className="px-3 py-2 font-semibold">Par</th>
                <th className="px-3 py-2 font-semibold">Yards</th>
                <th className="px-3 py-2 font-semibold">Stroke index</th>
              </tr>
            </thead>
            <tbody>
              {[front, back].map((half, i) => (
                <FragmentRows key={i} half={half} label={i === 0 ? "Out" : "In"} onPick={(x) => { setN(x); setReplay((r) => r + 1); }} sum={sum} />
              ))}
              <tr className="border-t-2 border-ink font-bold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2">{sum(course.holes, "par")}</td>
                <td className="px-3 py-2">{sum(course.holes, "yards")}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FragmentRows({
  half,
  label,
  onPick,
  sum,
}: {
  half: typeof course.holes;
  label: string;
  onPick: (n: number) => void;
  sum: (hs: typeof course.holes, k: "par" | "yards") => number;
}) {
  return (
    <>
      {half.map((h) => (
        <tr key={h.n} className="border-b border-rime">
          <td className="px-3 py-1.5">
            <button type="button" onClick={() => onPick(h.n)} className="num text-lg underline underline-offset-2">
              {h.n}
            </button>
          </td>
          <td className="px-3 py-1.5">{h.par}</td>
          <td className="px-3 py-1.5">{h.yards}</td>
          <td className="px-3 py-1.5">{h.si}</td>
        </tr>
      ))}
      <tr className="border-b border-rime bg-frost font-semibold">
        <td className="px-3 py-1.5">{label}</td>
        <td className="px-3 py-1.5">{sum(half, "par")}</td>
        <td className="px-3 py-1.5">{sum(half, "yards")}</td>
        <td />
      </tr>
    </>
  );
}

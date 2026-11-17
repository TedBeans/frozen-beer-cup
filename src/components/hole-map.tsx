"use client";

import { useId, useMemo, useState } from "react";
import art from "@/lib/hole-art.json";
import type { Hole } from "@/lib/course";

type Pt = [number, number];
type Ell = [number, number, number, number, number];
interface HoleArt {
  line: Pt[];
  green: Ell;
  fairway: Pt[] | Pt[][];
  bunkers: Ell[];
  water: Pt[][];
  sand?: Pt[][];
  trees?: boolean;
}
const ART = art as unknown as Record<string, HoleArt>;

/** Closed smooth outline through the points (Catmull-Rom converted to cubic Béziers). */
function smooth(pts: Pt[], t = 0.5): string {
  const n = pts.length;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d + "Z";
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function polys(f: Pt[] | Pt[][]): Pt[][] {
  return typeof f[0][0] === "number" ? [f as Pt[]] : (f as Pt[][]);
}

function ellipse([cx, cy, rx, ry, rot]: Ell): { cx: number; cy: number; rx: number; ry: number; transform: string } {
  return { cx, cy, rx, ry, transform: `rotate(${rot} ${cx} ${cy})` };
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Arc between two points: a gentle bow to one side, so each shot reads as a flight. */
function arc(a: Pt, b: Pt, bow: number): { d: string; mid: Pt } {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bow * len;
  const cy = my + (dx / len) * bow * len;
  return { d: `Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0]},${b[1]}`, mid: [mx, my] };
}

export function HoleMap({
  hole,
  replayKey,
  maxHeight = "72dvh",
}: {
  hole: Hole;
  replayKey: number;
  maxHeight?: string;
}) {
  const a = ART[String(hole.n)];
  const uid = useId().replace(/:/g, "");
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const geo = useMemo(() => {
    const line = a.line;
    const fair = polys(a.fairway);
    // Frame the playable corridor plus a margin; water and sand may run off the edge.
    const core = [...line, ...fair.flat(), [a.green[0] - a.green[2], a.green[1] - a.green[3]], [a.green[0] + a.green[2], a.green[1] + a.green[3]]] as Pt[];
    const minX = Math.min(...core.map((p) => p[0])) - 120;
    const maxX = Math.max(...core.map((p) => p[0])) + 120;
    const minY = Math.min(...core.map((p) => p[1])) - 70;
    const maxY = Math.max(...core.map((p) => p[1])) + 60;
    const w = Math.max(maxX - minX, 340);
    const cx = (minX + maxX) / 2;
    const view = { x: cx - w / 2, y: minY, w, h: maxY - minY };

    // Shots: tee -> each waypoint -> green. Distances scale to the real yardage.
    const segLens = line.slice(1).map((p, i) => dist(line[i], p));
    const total = segLens.reduce((s, v) => s + v, 0);
    const bows = segLens.map((_, i) => (i % 2 === 0 ? 0.07 : -0.07));
    const arcs = line.slice(1).map((p, i) => arc(line[i], p, bows[i]));
    const path = `M${line[0][0]},${line[0][1]}` + arcs.map((x) => x.d).join("");
    const yards = segLens.map((l) => Math.round((l / total) * hole.yards));

    // Trees: scatter canopies outside the playable corridor, away from water.
    const trees: { x: number; y: number; r: number }[] = [];
    if (a.trees) {
      const rnd = seeded(hole.n * 7919);
      for (let i = 0; i < 520 && trees.length < 150; i++) {
        const p: Pt = [view.x + rnd() * view.w, view.y + rnd() * view.h];
        const near = Math.min(...line.slice(1).map((q, k) => distToSegment(p, line[k], q)));
        if (near < 78) continue;
        if (a.water.some((w2) => pointInPoly(p, w2))) continue;
        if (fair.some((f) => pointInPoly(p, f))) continue;
        trees.push({ x: p[0], y: p[1], r: 9 + rnd() * 11 });
      }
    }
    return { view, path, arcs, yards, trees, segLens, total, line };
  }, [a, hole.n, hole.yards]);

  const dur = Math.max(2.6, Math.min(5.2, geo.total / 190));
  const cum = geo.segLens.reduce<number[]>((acc, l) => [...acc, (acc.at(-1) ?? 0) + l / geo.total], []);
  const anim = !reduced;
  const [tee, ...rest] = geo.line;
  const green = rest.at(-1)!;
  const stagger = (i: number) => (anim ? { animationDelay: `${i * 90}ms` } : undefined);

  // Ball radius: rises and falls once per shot.
  const rKeyTimes = ["0", ...cum.flatMap((c, i) => [((cum[i - 1] ?? 0) + c) / 2, c])].map((v) => Number(v).toFixed(4)).join(";");
  const rValues = ["4", ...cum.flatMap(() => ["8", "4"])].join(";");

  return (
    <svg
      key={replayKey}
      viewBox={`${geo.view.x} ${geo.view.y} ${geo.view.w} ${geo.view.h}`}
      className="hole-map block h-auto w-full"
      style={{ maxHeight, background: "var(--hole-rough)" }}
      role="img"
      aria-label={`Hole ${hole.n}, par ${hole.par}, ${hole.yards} yards. ${geo.yards
        .map((y, i) => (i === geo.yards.length - 1 ? `${y} yards in to the green` : `${y} yards to the landing area`))
        .join(", then ")}.`}
    >
      <defs>
        <pattern id={`${uid}-mow`} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <rect width="26" height="26" fill="transparent" />
          <rect width="13" height="26" fill="#fff" opacity="0.07" />
        </pattern>
        <clipPath id={`${uid}-fw`}>
          {polys(a.fairway).map((f, i) => (
            <path key={i} d={smooth(f)} />
          ))}
        </clipPath>
        <radialGradient id={`${uid}-vig`} cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
      </defs>

      {/* Trees sit under everything else so the corridor stays clear. */}
      <g aria-hidden="true">
        {geo.trees.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.r} fill="var(--hole-tree)" opacity={0.55 + (i % 4) * 0.1} />
        ))}
      </g>

      <g aria-hidden="true" className={anim ? "hm-rise" : undefined} style={stagger(0)}>
        {a.water.map((w, i) => (
          <g key={i}>
            <path d={smooth(w)} fill="var(--hole-water)" />
            <path d={smooth(w)} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" />
          </g>
        ))}
      </g>

      <g aria-hidden="true" className={anim ? "hm-rise" : undefined} style={stagger(1)}>
        {(a.sand ?? []).map((s, i) => (
          <path key={i} d={smooth(s)} fill="var(--hole-sand)" />
        ))}
        {polys(a.fairway).map((f, i) => (
          <path key={i} d={smooth(f)} fill="var(--hole-fairway)" />
        ))}
        <rect
          x={geo.view.x}
          y={geo.view.y}
          width={geo.view.w}
          height={geo.view.h}
          fill={`url(#${uid}-mow)`}
          clipPath={`url(#${uid}-fw)`}
        />
      </g>

      <g aria-hidden="true" className={anim ? "hm-rise" : undefined} style={stagger(2)}>
        {a.bunkers.map((b, i) => (
          <g key={i}>
            <ellipse {...ellipse(b)} fill="var(--hole-sand)" />
            <ellipse {...ellipse(b)} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
          </g>
        ))}
        <ellipse {...ellipse(a.green)} fill="var(--hole-green)" />
        <ellipse {...ellipse(a.green)} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" />
        {/* Tee box */}
        <rect x={tee[0] - 15} y={tee[1] - 12} width="30" height="24" rx="4" fill="var(--hole-fairway)" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
      </g>

      {/* Flight path: draws itself, then the ball follows it. */}
      <path
        d={geo.path}
        fill="none"
        stroke="var(--hole-line)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="1 11"
        opacity="0.9"
        aria-hidden="true"
      />
      {anim ? (
        <path
          d={geo.path}
          pathLength={1}
          fill="none"
          stroke="var(--hole-line)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="1"
          className="hm-draw"
          style={{ animationDuration: `${dur}s`, animationDelay: "0.9s" }}
          aria-hidden="true"
        />
      ) : null}

      {/* Landing markers and yardages */}
      {rest.map((p, i) => {
        const isGreen = i === rest.length - 1;
        const delay = anim ? 0.9 + dur * cum[i] : 0;
        return (
          <g key={i} className={anim ? "hm-pop" : undefined} style={{ animationDelay: `${delay}s`, transformOrigin: `${p[0]}px ${p[1]}px` }}>
            {!isGreen ? <circle cx={p[0]} cy={p[1]} r="10" fill="none" stroke="var(--hole-line)" strokeWidth="3" /> : null}
            <YardTag x={p[0]} y={p[1]} side={p[0] > geo.view.x + geo.view.w * 0.55 ? -1 : 1} text={`${geo.yards[i]}`} sub={isGreen ? "to green" : i === 0 ? "tee shot" : "layup"} offsetY={isGreen ? 40 : 0} />
          </g>
        );
      })}

      {/* Flag */}
      <g className={anim ? "hm-flag" : undefined} style={{ transformOrigin: `${green[0]}px ${green[1]}px` }} aria-hidden="true">
        <line x1={green[0]} y1={green[1]} x2={green[0]} y2={green[1] - 40} stroke="var(--hole-ink)" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${green[0]},${green[1] - 40} l24,9 l-24,10z`} fill="var(--color-amber)" />
        <circle cx={green[0]} cy={green[1]} r="5" fill="var(--hole-ink)" />
      </g>

      {/* Ball */}
      <g aria-hidden="true">
        {anim ? (
          <circle r="4" fill="#fff" stroke="var(--hole-ink)" strokeWidth="1.5" opacity="0">
            <animate attributeName="opacity" values="0;1;1" keyTimes="0;0.001;1" dur={`${dur}s`} begin="0.9s" fill="freeze" />
            <animateMotion path={geo.path} dur={`${dur}s`} begin="0.9s" fill="freeze" calcMode="linear" />
            <animate attributeName="r" values={rValues} keyTimes={rKeyTimes} dur={`${dur}s`} begin="0.9s" fill="freeze" />
          </circle>
        ) : (
          <circle cx={tee[0]} cy={tee[1]} r="5" fill="#fff" stroke="var(--hole-ink)" strokeWidth="1.5" />
        )}
      </g>

      <rect x={geo.view.x} y={geo.view.y} width={geo.view.w} height={geo.view.h} fill={`url(#${uid}-vig)`} pointerEvents="none" />
    </svg>
  );
}

function YardTag({ x, y, side, text, sub, offsetY }: { x: number; y: number; side: number; text: string; sub: string; offsetY: number }) {
  const w = 76;
  const h = 42;
  const tx = side > 0 ? x + 16 : x - 16 - w;
  const ty = y - h / 2 + offsetY;
  return (
    <g>
      <rect x={tx} y={ty} width={w} height={h} rx="8" fill="var(--hole-ink)" opacity="0.92" />
      <text x={tx + w / 2} y={ty + 20} textAnchor="middle" fontSize="21" fontWeight="800" fill="var(--color-glass)" style={{ fontFamily: "var(--font-display)" }}>
        {text}y
      </text>
      <text x={tx + w / 2} y={ty + 35} textAnchor="middle" fontSize="11" fill="var(--color-glass)" opacity="0.8">
        {sub}
      </text>
    </g>
  );
}

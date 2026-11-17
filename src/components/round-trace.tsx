import type { HoleResult } from "@/lib/scoring";

/**
 * One column per hole. A bar rising above the line means the team beat par on
 * that hole; a bar hanging below means it lost ground. Par is a dot, and
 * holes not played yet are a faint tick.
 */
export function RoundTrace({ holes, color }: { holes: HoleResult[]; color: string }) {
  const W = 18;
  const gap = 5;
  const mid = 22;
  const unit = 8;
  const width = holes.length * (W + gap) - gap;
  const played = holes.filter((h) => h.gross !== null);
  const label =
    played.length === 0
      ? "No holes played yet"
      : `Score against par on each of ${played.length} holes played`;
  return (
    <svg
      viewBox={`0 0 ${width} ${mid * 2}`}
      className="mt-3 w-full"
      role="img"
      aria-label={label}
    >
      <line x1="0" x2={width} y1={mid} y2={mid} stroke="#c9dae0" strokeWidth="1" />
      {holes.map((h, i) => {
        const x = i * (W + gap);
        if (h.gross === null) {
          return <rect key={h.hole} x={x + W / 2 - 1} y={mid - 3} width="2" height="6" fill="#c9dae0" />;
        }
        const diff = h.gross - h.par;
        if (diff === 0) {
          return <circle key={h.hole} cx={x + W / 2} cy={mid} r="3.2" fill={color} />;
        }
        const len = Math.min(Math.abs(diff), 2.5) * unit;
        return diff < 0 ? (
          <rect key={h.hole} x={x} y={mid - len} width={W} height={len} rx="2" fill={color} />
        ) : (
          <rect key={h.hole} x={x} y={mid} width={W} height={len} rx="2" fill="#9db1bd" />
        );
      })}
    </svg>
  );
}

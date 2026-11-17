import { scoreKind } from "@/lib/scoring";

/** A score as golfers read it: circle for under par, plain for par, square for over. */
export function ScoreMark({ gross, par, color, size = 34 }: { gross: number; par: number; color: string; size?: number }) {
  const kind = scoreKind(gross, par);
  const under = kind === "eagle" || kind === "birdie";
  return (
    <span
      className={`num inline-flex shrink-0 items-center justify-center ${under ? "rounded-full" : kind === "par" ? "" : "rounded-[4px]"}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        border: kind === "par" ? "2px solid transparent" : `2px solid ${color}`,
        boxShadow: kind === "eagle" || kind === "double" ? `0 0 0 2px var(--color-glass), 0 0 0 4px ${color}` : undefined,
        color: "var(--color-ink)",
      }}
      aria-label={`${gross}`}
    >
      {gross}
    </span>
  );
}

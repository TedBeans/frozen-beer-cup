import { formatToPar, type TeamResult } from "@/lib/scoring";

/** Three compact team chips: place, name, score to par, holes played. Always visible. */
export function StandingsStrip({ board, onClick }: { board: TeamResult[]; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={onClick ? "Open standings" : undefined}
      className="grid w-full grid-cols-3 gap-2 text-left"
    >
      {board.map((r) => (
        <div
          key={r.team.id}
          className="min-w-0 rounded-xl border border-rime bg-glass px-2.5 py-1.5"
          style={{ borderBottom: `4px solid ${r.team.color}` }}
        >
          <div className="flex items-baseline justify-between gap-1">
            <span className="truncate text-xs font-semibold">
              {r.rank ? <b className="mr-1 text-muted">{r.tied ? "T" : ""}{r.rank}</b> : null}
              {r.team.name}
            </span>
            <span className="num text-2xl leading-none" style={{ color: r.thru > 0 && r.toPar < 0 ? r.team.color : undefined }}>
              {r.thru > 0 ? formatToPar(r.toPar) : "–"}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{r.thru === 0 ? "Not started" : r.finished ? "Finished" : `Thru ${r.thru}`}</div>
        </div>
      ))}
    </Tag>
  );
}

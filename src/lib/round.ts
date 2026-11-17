import { getCourse } from "./course";
import { computeLeaderboard, scoreKind, scoreName, type ScoreKind } from "./scoring";
import type { EventState, TeamRow } from "./types";

export type HoleCell = {
  team: TeamRow;
  gross: number | null;
  drive: string | null;
  putt: string | null;
};

export type HoleLine = {
  hole: number;
  par: number;
  yards: number;
  si: number;
  cells: HoleCell[];
  /** Team with the lone best score on the hole, if every team has posted and nobody tied. */
  winnerId: number | null;
  done: boolean;
};

/** One row per hole with each team's gross and who drove and putted. */
export function holeLines(state: EventState): HoleLine[] {
  const course = getCourse(state.event.courseKey);
  const names = new Map(state.roster.map((p) => [p.playerId, p.name.trim()]));
  return course.holes.map((h) => {
    const cells: HoleCell[] = state.teams.map((team) => {
      const row = state.scores.find((s) => s.teamId === team.id && s.hole === h.n);
      return {
        team,
        gross: row ? row.gross : null,
        drive: row?.drivePlayerId != null ? (names.get(row.drivePlayerId) ?? null) : null,
        putt: row?.puttPlayerId != null ? (names.get(row.puttPlayerId) ?? null) : null,
      };
    });
    const posted = cells.filter((c) => c.gross !== null);
    const best = posted.length ? Math.min(...posted.map((c) => c.gross as number)) : null;
    const leaders = posted.filter((c) => c.gross === best);
    return {
      hole: h.n,
      par: h.par,
      yards: h.yards,
      si: h.si,
      cells,
      winnerId: posted.length === cells.length && leaders.length === 1 ? leaders[0].team.id : null,
      done: posted.length === cells.length && cells.length > 0,
    };
  });
}

/** The hole the group is on: the first one some team hasn't posted yet. */
export function currentHole(lines: HoleLine[]): number {
  const open = lines.find((l) => !l.done);
  return open ? open.hole : lines.length;
}

export type Moment = { team: TeamRow; hole: number; gross: number; par: number; kind: ScoreKind; label: string };

/** Latest posted scores, newest hole first. Scores carry no timestamps, so hole order stands in. */
export function moments(lines: HoleLine[], limit = 6): Moment[] {
  const out: Moment[] = [];
  for (const l of [...lines].reverse()) {
    for (const c of [...l.cells].reverse()) {
      if (c.gross === null) continue;
      out.push({ team: c.team, hole: l.hole, gross: c.gross, par: l.par, kind: scoreKind(c.gross, l.par), label: scoreName(c.gross, l.par) });
    }
  }
  return out.slice(0, limit);
}

/** Running score to par after each hole, per team, for the race chart. */
export function race(state: EventState): { team: TeamRow; points: { hole: number; toPar: number }[] }[] {
  const lines = holeLines(state);
  const order = computeLeaderboard(state).map((r) => r.team);
  return order.map((team) => {
    let run = 0;
    const points: { hole: number; toPar: number }[] = [];
    for (const l of lines) {
      const c = l.cells.find((x) => x.team.id === team.id);
      if (!c || c.gross === null) continue;
      run += c.gross - l.par;
      points.push({ hole: l.hole, toPar: run });
    }
    return { team, points };
  });
}

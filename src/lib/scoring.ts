import { coursePar, getCourse, type Course } from "./course";
import type { EventState, RosterEntry, TeamRow } from "./types";

/**
 * Handicaps do NOT affect scoring: the Cup is decided on gross score to par.
 * They are only used to build and compare even teams. A team's balance number is
 * each player's course handicap, sorted low to high, then weighted (30/20/10 is a
 * common three-player scramble weighting).
 */
export const TEAM_WEIGHTS = [0.3, 0.2, 0.1];

export function courseHandicap(index: number, course: Course): number {
  const par = coursePar(course);
  return Math.round(index * (course.slope / 113) + (course.rating - par));
}

export function teamHandicap(
  indexes: number[],
  course: Course,
  weights: number[] = TEAM_WEIGHTS,
): { courseHandicaps: number[]; handicap: number } {
  const courseHandicaps = indexes
    .map((i) => courseHandicap(i, course))
    .sort((a, b) => a - b);
  const raw = courseHandicaps.reduce(
    (sum, ch, i) => sum + ch * (weights[i] ?? weights[weights.length - 1] ?? 0),
    0,
  );
  return { courseHandicaps, handicap: Math.max(0, Math.round(raw)) };
}

export type HoleResult = {
  hole: number;
  par: number;
  yards: number;
  si: number;
  gross: number | null;
  drivePlayerId: number | null;
  puttPlayerId: number | null;
};

export type TeamResult = {
  team: TeamRow;
  players: RosterEntry[];
  holes: HoleResult[];
  thru: number;
  gross: number;
  parPlayed: number;
  /** Score against par over the holes played so far. This decides the Cup. */
  toPar: number;
  rank: number;
  tied: boolean;
  finished: boolean;
};

export function computeTeamResult(
  team: TeamRow,
  state: EventState,
  course: Course,
): TeamResult {
  const players = state.roster.filter((p) => p.teamId === team.id);
  const byHole = new Map(
    state.scores.filter((s) => s.teamId === team.id).map((s) => [s.hole, s]),
  );
  let gross = 0;
  let parPlayed = 0;
  let thru = 0;
  const holes: HoleResult[] = course.holes.map((h) => {
    const s = byHole.get(h.n);
    if (s) {
      thru += 1;
      gross += s.gross;
      parPlayed += h.par;
    }
    return {
      hole: h.n,
      par: h.par,
      yards: h.yards,
      si: h.si,
      gross: s ? s.gross : null,
      drivePlayerId: s ? s.drivePlayerId : null,
      puttPlayerId: s ? s.puttPlayerId : null,
    };
  });
  return {
    team,
    players,
    holes,
    thru,
    gross,
    parPlayed,
    toPar: gross - parPlayed,
    rank: 1,
    tied: false,
    finished: thru === course.holes.length,
  };
}

/** Results for every team, sorted best score to par first, with ranks and ties filled in. */
export function computeLeaderboard(state: EventState): TeamResult[] {
  const course = getCourse(state.event.courseKey);
  const results = state.teams
    .map((t) => computeTeamResult(t, state, course))
    .sort((a, b) => {
      if ((a.thru === 0) !== (b.thru === 0)) return a.thru === 0 ? 1 : -1;
      if (a.toPar !== b.toPar) return a.toPar - b.toPar;
      return a.team.position - b.team.position;
    });
  results.forEach((r, i) => {
    if (r.thru === 0) {
      r.rank = 0;
      return;
    }
    const prev = results[i - 1];
    r.rank = prev && prev.thru > 0 && prev.toPar === r.toPar ? prev.rank : i + 1;
  });
  results.forEach((r) => {
    r.tied = r.rank > 0 && results.filter((o) => o.rank === r.rank).length > 1;
  });
  return results;
}

export function champion(state: EventState): TeamResult | null {
  const board = computeLeaderboard(state);
  if (board.length === 0 || !board.every((r) => r.finished)) return null;
  return board[0].tied ? null : board[0];
}

export function formatToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export type ScoreKind = "eagle" | "birdie" | "par" | "bogey" | "double";

export function scoreKind(gross: number, par: number): ScoreKind {
  const d = gross - par;
  if (d <= -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  return "double";
}

export function scoreName(gross: number, par: number): string {
  if (gross === 1) return "Hole in one";
  const k = scoreKind(gross, par);
  if (k === "eagle") return gross - par <= -3 ? "Albatross" : "Eagle";
  if (k === "birdie") return "Birdie";
  if (k === "par") return "Par";
  if (k === "bogey") return "Bogey";
  return gross - par === 2 ? "Double bogey" : `+${gross - par}`;
}

export function resultCounts(result: TeamResult) {
  const counts = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0 };
  for (const h of result.holes) {
    if (h.gross !== null) counts[scoreKind(h.gross, h.par)] += 1;
  }
  return counts;
}

export type Contribution = {
  playerId: number;
  name: string;
  teamId: number | null;
  drives: number;
  putts: number;
};

/** Which players' tee shots and putts the team picked, per player. */
export function contributions(state: EventState): Contribution[] {
  return state.roster.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    teamId: p.teamId,
    drives: state.scores.filter((s) => s.drivePlayerId === p.playerId).length,
    putts: state.scores.filter((s) => s.puttPlayerId === p.playerId).length,
  }));
}

export type HoleAverage = {
  hole: number;
  par: number;
  yards: number;
  si: number;
  rounds: number;
  avgToPar: number | null;
  best: number | null;
};

/** Average team score to par on each hole, across the given events. */
export function holeAverages(states: EventState[], course: Course): HoleAverage[] {
  return course.holes.map((h) => {
    const grosses = states
      .filter((s) => s.event.courseKey === course.key)
      .flatMap((s) => s.scores.filter((r) => r.hole === h.n).map((r) => r.gross));
    return {
      hole: h.n,
      par: h.par,
      yards: h.yards,
      si: h.si,
      rounds: grosses.length,
      avgToPar:
        grosses.length === 0
          ? null
          : grosses.reduce((a, b) => a + b, 0) / grosses.length - h.par,
      best: grosses.length === 0 ? null : Math.min(...grosses),
    };
  });
}

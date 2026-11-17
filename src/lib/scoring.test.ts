import { describe, expect, it } from "vitest";
import { CRYSTAL_SPRINGS_GOLD as course, coursePar } from "./course";
import {
  champion,
  computeLeaderboard,
  courseHandicap,
  formatToPar,
  scoreKind,
  teamHandicap,
} from "./scoring";
import type { EventState } from "./types";

describe("course data", () => {
  it("is par 70, 6,177 yards, with each stroke index used once", () => {
    expect(coursePar(course)).toBe(70);
    expect(course.holes.reduce((s, h) => s + h.yards, 0)).toBe(6177);
    expect(course.holes.map((h) => h.si).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );
    expect(coursePar(course, [1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(34);
  });
});

describe("handicaps (team balance only)", () => {
  it("converts an index to a course handicap on Gold (125 slope, 69.8 rating)", () => {
    expect(courseHandicap(5.5, course)).toBe(6);
    expect(courseHandicap(23, course)).toBe(25);
  });

  it("weights the 2026 teams to 9, 8 and 8", () => {
    expect(teamHandicap([5.5, 20, 23], course).handicap).toBe(9);
    expect(teamHandicap([11.1, 13.8, 15], course).handicap).toBe(8);
    expect(teamHandicap([11.3, 13.7, 14], course).handicap).toBe(8);
  });
});

describe("leaderboard", () => {
  const base: EventState = {
    event: { id: 1, year: 2026, title: "t", courseKey: course.key, playedOn: null },
    years: [2026],
    teams: [
      { id: 1, name: "A", color: "#000", position: 1 },
      { id: 2, name: "B", color: "#000", position: 2 },
      { id: 3, name: "C", color: "#000", position: 3 },
    ],
    roster: [
      { playerId: 1, name: "P1", teamId: 1, handicapIndex: 5.5, source: "GHIN" },
      { playerId: 2, name: "P2", teamId: 2, handicapIndex: 20, source: "Estimate" },
      { playerId: 3, name: "P3", teamId: 3, handicapIndex: 23, source: "Estimate" },
    ],
    scores: [],
  };
  const row = (teamId: number, hole: number, gross: number) => ({
    teamId,
    hole,
    gross,
    drivePlayerId: null,
    puttPlayerId: null,
  });

  it("ranks by gross score to par and shares rank on ties", () => {
    const state: EventState = {
      ...base,
      scores: [row(1, 1, 5), row(2, 1, 3), row(3, 1, 3)],
    };
    const board = computeLeaderboard(state);
    const [first, second, third] = board;
    expect(first.toPar).toBe(-1);
    expect(first.rank).toBe(1);
    expect(first.tied).toBe(true);
    expect(second.rank).toBe(1);
    expect(third.team.id).toBe(1);
    expect(third.toPar).toBe(1);
    expect(third.rank).toBe(3);
    expect(third.tied).toBe(false);
  });

  it("gives no handicap strokes: a high handicap and a low handicap score the same", () => {
    // Team 1 has the best handicap and team 3 the worst; identical scores tie.
    const state: EventState = { ...base, scores: [row(1, 9, 4), row(3, 9, 4)] };
    const r1 = computeLeaderboard(state).find((x) => x.team.id === 1)!;
    const r3 = computeLeaderboard(state).find((x) => x.team.id === 3)!;
    expect(r1.toPar).toBe(0);
    expect(r3.toPar).toBe(0);
    expect(r1.rank).toBe(r3.rank);
  });

  it("totals gross and par over the holes played only", () => {
    const state: EventState = { ...base, scores: [row(1, 9, 4), row(1, 12, 2)] };
    const r = computeLeaderboard(state).find((x) => x.team.id === 1)!;
    expect(r.gross).toBe(6);
    expect(r.parPlayed).toBe(7);
    expect(r.toPar).toBe(-1);
    expect(r.thru).toBe(2);
  });

  it("puts teams with no holes at the bottom with no rank", () => {
    const board = computeLeaderboard({ ...base, scores: [] });
    expect(board.every((r) => r.rank === 0)).toBe(true);
  });

  it("names a champion only when everyone finished and nobody tied", () => {
    expect(champion(base)).toBeNull();
    const full = (teamId: number, over: number) =>
      course.holes.map((h) => row(teamId, h.n, h.par + over));
    const state: EventState = {
      ...base,
      scores: [...full(1, 3), ...full(2, 0), ...full(3, 2)],
    };
    expect(champion(state)?.team.id).toBe(2);
    const tie: EventState = { ...base, scores: [...full(1, 3), ...full(2, 0), ...full(3, 0)] };
    expect(champion(tie)).toBeNull();
  });
});

describe("helpers", () => {
  it("formats to par", () => {
    expect(formatToPar(0)).toBe("E");
    expect(formatToPar(3)).toBe("+3");
    expect(formatToPar(-2)).toBe("−2");
  });
  it("classifies scores", () => {
    expect(scoreKind(3, 5)).toBe("eagle");
    expect(scoreKind(3, 4)).toBe("birdie");
    expect(scoreKind(4, 4)).toBe("par");
    expect(scoreKind(5, 4)).toBe("bogey");
    expect(scoreKind(7, 4)).toBe("double");
  });
});

import { playerNames } from "./format";

describe("playerNames", () => {
  it("returns full first and last names", () => {
    const r = (playerId: number, name: string) => ({
      playerId,
      name,
      teamId: null,
      handicapIndex: 10,
      source: "GHIN",
    });
    const names = playerNames([r(1, "Jerry Howe"), r(2, "John Sieckhaus"), r(3, " John Sansone ")]);
    expect(names.get(1)).toBe("Jerry Howe");
    expect(names.get(2)).toBe("John Sieckhaus");
    expect(names.get(3)).toBe("John Sansone");
  });
});

export type TeamRow = {
  id: number;
  name: string;
  color: string;
  position: number;
};

export type RosterEntry = {
  playerId: number;
  name: string;
  teamId: number | null;
  handicapIndex: number;
  /** "GHIN", "18 Birdies" or "Estimate" */
  source: string;
};

export type ScoreRow = {
  teamId: number;
  hole: number;
  gross: number;
  drivePlayerId: number | null;
  puttPlayerId: number | null;
};

export type EventInfo = {
  id: number;
  year: number;
  title: string;
  courseKey: string;
  playedOn: string | null;
};

export type EventState = {
  event: EventInfo;
  teams: TeamRow[];
  roster: RosterEntry[];
  scores: ScoreRow[];
  years: number[];
};

export const HANDICAP_SOURCES = ["GHIN", "18 Birdies", "Estimate"] as const;

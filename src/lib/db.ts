import { neon } from "@neondatabase/serverless";
import { CRYSTAL_SPRINGS_GOLD } from "./course";
import type {
  EventInfo,
  EventState,
  RosterEntry,
  ScoreRow,
  TeamRow,
} from "./types";

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;
let ready: Promise<void> | null = null;

function db(): Sql {
  if (client) return client;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add a Neon Postgres database to the Vercel project (see README).",
    );
  }
  client = neon(url);
  return client;
}

/** Seed for the first Frozen Beer Cup on this app: 2026, three teams of three. */
const SEED = {
  year: 2026,
  title: "Frozen Beer Cup 2026",
  playedOn: "2026-11-27",
  teams: [
    { name: "Amber", color: "#C97B0A" },
    { name: "Glacier", color: "#2B78A6" },
    { name: "Hops", color: "#4E7D2E" },
  ],
  players: [
    { name: "Jerry Howe", index: 5.5, source: "GHIN", team: 0 },
    { name: "Luke Marcouiller", index: 20, source: "Estimate", team: 0 },
    { name: "John Sansone", index: 23, source: "Estimate", team: 0 },
    { name: "John Sieckhaus", index: 11.1, source: "GHIN", team: 1 },
    { name: "Patrick Wiegers", index: 13.8, source: "18 Birdies", team: 1 },
    { name: "Nic Delgado", index: 15, source: "GHIN", team: 1 },
    { name: "Teddy Schmitt", index: 11.3, source: "GHIN", team: 2 },
    { name: "Brent Smith", index: 13.7, source: "GHIN", team: 2 },
    { name: "Peter Hoffmeister", index: 14, source: "Estimate", team: 2 },
  ],
};

export const TEAM_COLORS = ["#C97B0A", "#2B78A6", "#4E7D2E", "#8C3B6E", "#B2412F"];

async function migrate(): Promise<void> {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    year INT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    course_key TEXT NOT NULL,
    played_on DATE
  )`;
  await sql`CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INT NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS entries (
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    player_id INT NOT NULL REFERENCES players(id),
    team_id INT REFERENCES teams(id) ON DELETE SET NULL,
    handicap_index NUMERIC(4,1) NOT NULL,
    source TEXT NOT NULL DEFAULT 'GHIN',
    PRIMARY KEY (event_id, player_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS scores (
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    hole INT NOT NULL CHECK (hole BETWEEN 1 AND 18),
    gross INT NOT NULL CHECK (gross BETWEEN 1 AND 15),
    drive_player_id INT REFERENCES players(id) ON DELETE SET NULL,
    putt_player_id INT REFERENCES players(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, team_id, hole)
  )`;

  const existing = (await sql`SELECT count(*)::int AS n FROM events`) as { n: number }[];
  if (existing[0].n > 0) return;

  const inserted = (await sql`
    INSERT INTO events (year, title, course_key, played_on)
    VALUES (${SEED.year}, ${SEED.title}, ${CRYSTAL_SPRINGS_GOLD.key}, ${SEED.playedOn})
    ON CONFLICT (year) DO NOTHING
    RETURNING id`) as { id: number }[];
  if (inserted.length === 0) return;
  const eventId = inserted[0].id;

  const teamIds: number[] = [];
  for (const [i, t] of SEED.teams.entries()) {
    const row = (await sql`
      INSERT INTO teams (event_id, name, color, position)
      VALUES (${eventId}, ${t.name}, ${t.color}, ${i + 1})
      RETURNING id`) as { id: number }[];
    teamIds.push(row[0].id);
  }
  for (const p of SEED.players) {
    const player = (await sql`
      INSERT INTO players (name) VALUES (${p.name})
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id`) as { id: number }[];
    await sql`
      INSERT INTO entries (event_id, player_id, team_id, handicap_index, source)
      VALUES (${eventId}, ${player[0].id}, ${teamIds[p.team]}, ${p.index}, ${p.source})`;
  }
}

export function ensureReady(): Promise<void> {
  if (!ready) {
    ready = migrate().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

type EventRow = {
  id: number;
  year: number;
  title: string;
  course_key: string;
  played_on: string | null;
};

function toEventInfo(r: EventRow): EventInfo {
  return {
    id: r.id,
    year: r.year,
    title: r.title,
    courseKey: r.course_key,
    playedOn: r.played_on ? String(r.played_on).slice(0, 10) : null,
  };
}

async function loadState(event: EventRow, years: number[]): Promise<EventState> {
  const sql = db();
  const [teams, entries, scores] = await Promise.all([
    sql`SELECT id, name, color, position FROM teams WHERE event_id = ${event.id} ORDER BY position, id`,
    sql`SELECT e.player_id, p.name, e.team_id, e.handicap_index, e.source
        FROM entries e JOIN players p ON p.id = e.player_id
        WHERE e.event_id = ${event.id}
        ORDER BY e.handicap_index, p.name`,
    sql`SELECT team_id, hole, gross, drive_player_id, putt_player_id
        FROM scores WHERE event_id = ${event.id} ORDER BY team_id, hole`,
  ]);
  return {
    event: toEventInfo(event),
    years,
    teams: (teams as TeamRow[]).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      position: t.position,
    })),
    roster: (entries as Record<string, unknown>[]).map(
      (e): RosterEntry => ({
        playerId: Number(e.player_id),
        name: String(e.name),
        teamId: e.team_id === null ? null : Number(e.team_id),
        handicapIndex: Number(e.handicap_index),
        source: String(e.source),
      }),
    ),
    scores: (scores as Record<string, unknown>[]).map(
      (s): ScoreRow => ({
        teamId: Number(s.team_id),
        hole: Number(s.hole),
        gross: Number(s.gross),
        drivePlayerId: s.drive_player_id === null ? null : Number(s.drive_player_id),
        puttPlayerId: s.putt_player_id === null ? null : Number(s.putt_player_id),
      }),
    ),
  };
}

async function listEvents(): Promise<EventRow[]> {
  const sql = db();
  return (await sql`SELECT id, year, title, course_key, played_on::text AS played_on
                    FROM events ORDER BY year DESC`) as EventRow[];
}

/** State for one year, or the most recent event when no year is given. */
export async function getEventState(year?: number): Promise<EventState | null> {
  await ensureReady();
  const events = await listEvents();
  if (events.length === 0) return null;
  const event = (year && events.find((e) => e.year === year)) || events[0];
  return loadState(
    event,
    events.map((e) => e.year),
  );
}

export async function getAllStates(): Promise<EventState[]> {
  await ensureReady();
  const events = await listEvents();
  const years = events.map((e) => e.year);
  return Promise.all(events.map((e) => loadState(e, years)));
}

export async function saveScore(input: {
  eventId: number;
  teamId: number;
  hole: number;
  gross: number;
  drivePlayerId: number | null;
  puttPlayerId: number | null;
}): Promise<void> {
  await ensureReady();
  const sql = db();
  await sql`
    INSERT INTO scores (event_id, team_id, hole, gross, drive_player_id, putt_player_id)
    SELECT ${input.eventId}::int, ${input.teamId}::int, ${input.hole}::int, ${input.gross}::int,
           ${input.drivePlayerId}::int, ${input.puttPlayerId}::int
    WHERE EXISTS (SELECT 1 FROM teams WHERE id = ${input.teamId}::int AND event_id = ${input.eventId}::int)
    ON CONFLICT (event_id, team_id, hole) DO UPDATE SET
      gross = EXCLUDED.gross,
      drive_player_id = EXCLUDED.drive_player_id,
      putt_player_id = EXCLUDED.putt_player_id,
      updated_at = now()`;
}

export async function clearScore(eventId: number, teamId: number, hole: number) {
  await ensureReady();
  const sql = db();
  await sql`DELETE FROM scores WHERE event_id = ${eventId} AND team_id = ${teamId} AND hole = ${hole}`;
}

export async function saveRoster(
  eventId: number,
  teams: { id: number; name: string }[],
  entries: { playerId: number; teamId: number | null; handicapIndex: number; source: string }[],
) {
  await ensureReady();
  const sql = db();
  await sql.transaction([
    ...teams.map(
      (t) => sql`UPDATE teams SET name = ${t.name} WHERE id = ${t.id} AND event_id = ${eventId}`,
    ),
    ...entries.map(
      (e) => sql`UPDATE entries
        SET team_id = ${e.teamId}::int, handicap_index = ${e.handicapIndex}, source = ${e.source}
        WHERE event_id = ${eventId} AND player_id = ${e.playerId}`,
    ),
  ]);
}

export async function addPlayer(
  eventId: number,
  name: string,
  handicapIndex: number,
  source: string,
) {
  await ensureReady();
  const sql = db();
  const player = (await sql`
    INSERT INTO players (name) VALUES (${name})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id`) as { id: number }[];
  await sql`
    INSERT INTO entries (event_id, player_id, team_id, handicap_index, source)
    VALUES (${eventId}, ${player[0].id}, NULL, ${handicapIndex}, ${source})
    ON CONFLICT (event_id, player_id) DO UPDATE SET
      handicap_index = EXCLUDED.handicap_index, source = EXCLUDED.source`;
}

export async function removeEntry(eventId: number, playerId: number) {
  await ensureReady();
  const sql = db();
  await sql`DELETE FROM entries WHERE event_id = ${eventId} AND player_id = ${playerId}`;
}

export async function addTeam(eventId: number, name: string) {
  await ensureReady();
  const sql = db();
  const count = (await sql`SELECT count(*)::int AS n FROM teams WHERE event_id = ${eventId}`) as {
    n: number;
  }[];
  const n = count[0].n;
  await sql`INSERT INTO teams (event_id, name, color, position)
            VALUES (${eventId}, ${name}, ${TEAM_COLORS[n % TEAM_COLORS.length]}, ${n + 1})`;
}

/** Start a new year: same course, same team names, everyone unassigned with last known handicap. */
export async function createEvent(year: number, playedOn: string | null) {
  await ensureReady();
  const sql = db();
  const events = await listEvents();
  const latest = events[0];
  const made = (await sql`
    INSERT INTO events (year, title, course_key, played_on)
    VALUES (${year}, ${"Frozen Beer Cup " + year}, ${latest?.course_key ?? CRYSTAL_SPRINGS_GOLD.key}, ${playedOn}::date)
    ON CONFLICT (year) DO NOTHING
    RETURNING id`) as { id: number }[];
  if (made.length === 0) throw new Error(`An event for ${year} already exists.`);
  const eventId = made[0].id;
  if (latest) {
    await sql`INSERT INTO teams (event_id, name, color, position)
              SELECT ${eventId}, name, color, position FROM teams WHERE event_id = ${latest.id}`;
    await sql`INSERT INTO entries (event_id, player_id, team_id, handicap_index, source)
              SELECT ${eventId}, player_id, NULL, handicap_index, source
              FROM entries WHERE event_id = ${latest.id}`;
  }
  return eventId;
}

export async function updateEventDate(eventId: number, playedOn: string | null) {
  await ensureReady();
  const sql = db();
  await sql`UPDATE events SET played_on = ${playedOn}::date WHERE id = ${eventId}`;
}

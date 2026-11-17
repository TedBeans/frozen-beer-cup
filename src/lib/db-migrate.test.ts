import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// A database created before team PINs existed: no pin column, Amber/Glacier/Hops names.
vi.mock("@neondatabase/serverless", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  await pg.exec(`
    CREATE TABLE players (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE events (id SERIAL PRIMARY KEY, year INT NOT NULL UNIQUE, title TEXT NOT NULL, course_key TEXT NOT NULL, played_on DATE);
    CREATE TABLE teams (id SERIAL PRIMARY KEY, event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE, name TEXT NOT NULL, color TEXT NOT NULL, position INT NOT NULL);
    INSERT INTO events (year, title, course_key, played_on) VALUES (2026, 'Frozen Beer Cup', 'crystal-springs-gold', '2026-11-27');
    INSERT INTO teams (event_id, name, color, position) VALUES
      (1, 'Amber', '#C97B0A', 1), (1, 'Glacier', '#2B78A6', 2), (1, 'Hops', '#4E7D2E', 3);
  `);
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
    return pg.query(text, values).then((r) => r.rows);
  };
  tag.transaction = (queries: Promise<unknown>[]) => Promise.all(queries);
  return { neon: () => tag };
});

let db: typeof import("./db");

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgres://test");
  db = await import("./db");
});
afterAll(() => vi.unstubAllEnvs());

describe("migration from the pre-PIN schema", () => {
  it("renames the default teams to colors and assigns unique PINs", async () => {
    const state = await db.getEventState();
    expect(state?.teams.map((t) => t.name)).toEqual(["Orange", "Blue", "Green"]);
    const pins = await db.getTeamPins(state!.event.id);
    const values = state!.teams.map((t) => pins[t.id]);
    expect(values.every((p) => /^\d{4}$/.test(p))).toBe(true);
    expect(new Set(values).size).toBe(3);
  });
});

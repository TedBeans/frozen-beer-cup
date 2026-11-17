import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Run the real SQL against an in-memory Postgres (PGlite) instead of Neon.
vi.mock("@neondatabase/serverless", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
    return pg.query(text, values).then((r) => r.rows);
  };
  tag.transaction = (queries: Promise<unknown>[]) => Promise.all(queries);
  return { neon: () => tag };
});

type Db = typeof import("./db");
let db: Db;

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "postgres://test");
  db = await import("./db");
});
afterAll(() => vi.unstubAllEnvs());

describe("database", () => {
  it("seeds the 2026 event with three teams of three", async () => {
    const state = await db.getEventState();
    expect(state?.event.year).toBe(2026);
    expect(state?.event.playedOn).toBe("2026-11-27");
    expect(state?.teams.map((t) => t.name)).toEqual(["Amber", "Glacier", "Hops"]);
    expect(state?.roster).toHaveLength(9);
    for (const t of state!.teams) {
      expect(state!.roster.filter((p) => p.teamId === t.id)).toHaveLength(3);
    }
    const jerry = state!.roster.find((p) => p.name === "Jerry Howe")!;
    expect(jerry.handicapIndex).toBe(5.5);
    expect(jerry.teamId).toBe(state!.teams[0].id);
  });

  it("seeds only once", async () => {
    await db.ensureReady();
    const all = await db.getAllStates();
    expect(all).toHaveLength(1);
  });

  it("saves, updates and clears a score", async () => {
    const s = (await db.getEventState())!;
    const team = s.teams[0];
    const drive = s.roster.find((p) => p.teamId === team.id)!.playerId;
    await db.saveScore({ eventId: s.event.id, teamId: team.id, hole: 1, gross: 4, drivePlayerId: drive, puttPlayerId: null });
    let after = (await db.getEventState())!;
    expect(after.scores).toEqual([{ teamId: team.id, hole: 1, gross: 4, drivePlayerId: drive, puttPlayerId: null }]);

    await db.saveScore({ eventId: s.event.id, teamId: team.id, hole: 1, gross: 3, drivePlayerId: null, puttPlayerId: drive });
    after = (await db.getEventState())!;
    expect(after.scores).toHaveLength(1);
    expect(after.scores[0]).toMatchObject({ gross: 3, drivePlayerId: null, puttPlayerId: drive });

    await db.clearScore(s.event.id, team.id, 1);
    after = (await db.getEventState())!;
    expect(after.scores).toHaveLength(0);
  });

  it("ignores a score for a team from another event", async () => {
    const s = (await db.getEventState())!;
    await db.saveScore({ eventId: s.event.id, teamId: 99999, hole: 2, gross: 3, drivePlayerId: null, puttPlayerId: null });
    expect((await db.getEventState())!.scores).toHaveLength(0);
  });

  it("rejects out-of-range scores at the database", async () => {
    const s = (await db.getEventState())!;
    await expect(
      db.saveScore({ eventId: s.event.id, teamId: s.teams[0].id, hole: 19, gross: 4, drivePlayerId: null, puttPlayerId: null }),
    ).rejects.toThrow();
  });

  it("edits the roster and team names", async () => {
    const s = (await db.getEventState())!;
    const nic = s.roster.find((p) => p.name === "Nic Delgado")!;
    await db.saveRoster(
      s.event.id,
      [{ id: s.teams[0].id, name: "Amber Ale" }],
      [{ playerId: nic.playerId, teamId: s.teams[0].id, handicapIndex: 16.2, source: "Estimate" }],
    );
    const after = (await db.getEventState())!;
    expect(after.teams[0].name).toBe("Amber Ale");
    const updated = after.roster.find((p) => p.playerId === nic.playerId)!;
    expect(updated).toMatchObject({ teamId: s.teams[0].id, handicapIndex: 16.2, source: "Estimate" });
  });

  it("adds and removes a player, and adds a team", async () => {
    const s = (await db.getEventState())!;
    await db.addPlayer(s.event.id, "Test Golfer", 18.4, "GHIN");
    let after = (await db.getEventState())!;
    const added = after.roster.find((p) => p.name === "Test Golfer")!;
    expect(added).toMatchObject({ teamId: null, handicapIndex: 18.4 });
    await db.removeEntry(s.event.id, added.playerId);
    after = (await db.getEventState())!;
    expect(after.roster.find((p) => p.name === "Test Golfer")).toBeUndefined();

    await db.addTeam(s.event.id, "Frost");
    after = (await db.getEventState())!;
    expect(after.teams.map((t) => t.name)).toContain("Frost");
  });

  it("starts a new year with copied teams and handicaps, and keeps history", async () => {
    await db.createEvent(2027, "2027-11-26");
    const latest = (await db.getEventState())!;
    expect(latest.event.year).toBe(2027);
    expect(latest.years).toEqual([2027, 2026]);
    expect(latest.roster).toHaveLength(9);
    expect(latest.roster.every((p) => p.teamId === null)).toBe(true);
    expect(latest.roster.find((p) => p.name === "Jerry Howe")!.handicapIndex).toBe(5.5);
    expect(latest.teams.length).toBeGreaterThanOrEqual(3);
    const old = (await db.getEventState(2026))!;
    expect(old.event.year).toBe(2026);
    await expect(db.createEvent(2027, null)).rejects.toThrow(/already exists/);
  });
});

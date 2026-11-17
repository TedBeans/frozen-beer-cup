import { checkAdminPin } from "@/lib/auth";
import {
  addPlayer,
  addTeam,
  createEvent,
  getTeamPins,
  removeEntry,
  saveRoster,
  updateEventDate,
} from "@/lib/db";
import { HANDICAP_SOURCES } from "@/lib/types";
import { fail, int, json, optionalInt } from "@/lib/api";

function source(v: unknown): string {
  return HANDICAP_SOURCES.find((s) => s === v) ?? "GHIN";
}

function handicap(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= -10 && n <= 54 ? Math.round(n * 10) / 10 : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = checkAdminPin(body.pin);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    switch (body.action) {
      case "saveRoster": {
        const eventId = int(body.eventId);
        if (eventId === null) return json({ error: "Missing event." }, 400);
        const teams = (Array.isArray(body.teams) ? body.teams : []).map(
          (t: { id: unknown; name: unknown; pin: unknown }) => ({
            id: int(t.id),
            name: String(t.name ?? "").trim().slice(0, 40),
            pin: t.pin === undefined || t.pin === null ? null : String(t.pin).trim(),
          }),
        );
        if (teams.some((t: { id: number | null; name: string }) => t.id === null || !t.name)) {
          return json({ error: "Every team needs a name." }, 400);
        }
        const pins = teams.map((t: { pin: string | null }) => t.pin).filter((p: string | null): p is string => p !== null);
        if (pins.some((p: string) => !/^[A-Za-z0-9]{3,12}$/.test(p))) {
          return json({ error: "Team PINs are 3 to 12 letters or numbers." }, 400);
        }
        if (new Set(pins.map((p: string) => p.toLowerCase())).size !== pins.length) {
          return json({ error: "Each team needs its own PIN." }, 400);
        }
        const entries = (Array.isArray(body.entries) ? body.entries : []).map(
          (e: { playerId: unknown; teamId: unknown; handicapIndex: unknown; source: unknown }) => ({
            playerId: int(e.playerId),
            teamId: optionalInt(e.teamId),
            handicapIndex: handicap(e.handicapIndex),
            source: source(e.source),
          }),
        );
        if (entries.some((e: { playerId: number | null; handicapIndex: number | null }) => e.playerId === null || e.handicapIndex === null)) {
          return json({ error: "Every player needs a handicap between -10 and 54." }, 400);
        }
        await saveRoster(eventId, teams, entries);
        return json({ ok: true });
      }
      case "teamPins": {
        const eventId = int(body.eventId);
        if (eventId === null) return json({ error: "Missing event." }, 400);
        return json({ pins: await getTeamPins(eventId) });
      }
      case "addPlayer": {
        const eventId = int(body.eventId);
        const name = String(body.name ?? "").trim().slice(0, 60);
        const hcp = handicap(body.handicapIndex);
        if (eventId === null || !name || hcp === null) {
          return json({ error: "Enter a name and a handicap between -10 and 54." }, 400);
        }
        await addPlayer(eventId, name, hcp, source(body.source));
        return json({ ok: true });
      }
      case "removePlayer": {
        const eventId = int(body.eventId);
        const playerId = int(body.playerId);
        if (eventId === null || playerId === null) return json({ error: "Missing player." }, 400);
        await removeEntry(eventId, playerId);
        return json({ ok: true });
      }
      case "addTeam": {
        const eventId = int(body.eventId);
        const name = String(body.name ?? "").trim().slice(0, 40);
        if (eventId === null || !name) return json({ error: "Enter a team name." }, 400);
        await addTeam(eventId, name);
        return json({ ok: true });
      }
      case "newEvent": {
        const year = int(body.year);
        if (year === null || year < 2000 || year > 2100) return json({ error: "Enter a year." }, 400);
        const date = typeof body.playedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.playedOn) ? body.playedOn : null;
        await createEvent(year, date);
        return json({ ok: true, year });
      }
      case "setDate": {
        const eventId = int(body.eventId);
        const date = typeof body.playedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.playedOn) ? body.playedOn : null;
        if (eventId === null) return json({ error: "Missing event." }, 400);
        await updateEventDate(eventId, date);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (err) {
    return fail(err);
  }
}

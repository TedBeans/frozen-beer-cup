import type { RosterEntry } from "./types";

export function formatDate(playedOn: string | null): string | null {
  if (!playedOn) return null;
  const d = new Date(`${playedOn}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Full first and last names, keyed by player id. */
export function playerNames(roster: RosterEntry[]): Map<number, string> {
  return new Map(roster.map((p) => [p.playerId, p.name.trim()]));
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

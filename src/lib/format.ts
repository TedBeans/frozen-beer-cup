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

/**
 * Short, unambiguous labels: "Jerry", "John S." when two players share a first name,
 * or the full name when even the last initial matches.
 */
export function shortNames(roster: RosterEntry[]): Map<number, string> {
  const first = (n: string) => n.trim().split(/\s+/)[0];
  const last = (n: string) => n.trim().split(/\s+/).slice(1).join(" ");
  const initial = (n: string) => (last(n) ? `${first(n)} ${last(n)[0]}.` : first(n));
  const count = (labels: string[]) => {
    const m = new Map<string, number>();
    for (const l of labels) m.set(l, (m.get(l) ?? 0) + 1);
    return m;
  };
  const firsts = count(roster.map((p) => first(p.name)));
  const initials = count(roster.map((p) => initial(p.name)));
  const out = new Map<number, string>();
  for (const p of roster) {
    const f = first(p.name);
    if ((firsts.get(f) ?? 0) <= 1) out.set(p.playerId, f);
    else if ((initials.get(initial(p.name)) ?? 0) <= 1) out.set(p.playerId, initial(p.name));
    else out.set(p.playerId, p.name.trim());
  }
  return out;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

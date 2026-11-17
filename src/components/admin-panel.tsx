"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCourse } from "@/lib/course";
import { TEAM_WEIGHTS, courseHandicap, teamHandicap } from "@/lib/scoring";
import { useEventState } from "@/lib/use-event-state";
import { HANDICAP_SOURCES, type EventState } from "@/lib/types";
import { LoadingNote, PageHeader, SetupNotice } from "./page-header";
import { PinGate } from "./pin-gate";

type Post = (body: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }>;

export function AdminPanel({
  initial,
  initialError,
}: {
  initial: EventState | null;
  initialError: string | null;
}) {
  const { state, error, refresh } = useEventState(initial, { intervalMs: 0 });
  if (!state) {
    return error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />;
  }
  return (
    <>
      <PageHeader state={state} title="Admin" />
      <PinGate target="admin">
        {(pin, lock) => <AdminBody state={state} pin={pin} lock={lock} refresh={refresh} />}
      </PinGate>
    </>
  );
}

function AdminBody({
  state,
  pin,
  lock,
  refresh,
}: {
  state: EventState;
  pin: string;
  lock: () => void;
  refresh: () => Promise<void>;
}) {
  const [pins, setPins] = useState<Record<string, string> | null>(null);
  const eventId = state.event.id;
  const teamSig = state.teams.map((t) => t.id).join(",");

  const post: Post = async (body) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        lock();
        return { ok: false, error: "Wrong PIN." };
      }
      if (!res.ok) return { ok: false, error: data.error ?? "Couldn't save." };
      if (body.action !== "teamPins") await refresh();
      return { ok: true, data };
    } catch {
      return { ok: false, error: "No connection. Try again when you have signal." };
    }
  };

  async function loadPins() {
    const r = await post({ action: "teamPins", eventId });
    if (r.ok && r.data) setPins(r.data.pins as Record<string, string>);
  }

  // Reload PINs when the event or its teams change (new year, added team).
  useEffect(() => {
    const t = setTimeout(() => void loadPins(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, teamSig, pin]);

  const sig =
    eventId +
    ":" +
    teamSig +
    ":" +
    state.roster.map((p) => p.playerId).join(",") +
    ":" +
    JSON.stringify(pins);

  return (
    <div className="space-y-8">
      {pins ? (
        <RosterEditor key={sig} state={state} pins={pins} post={post} onSaved={loadPins} />
      ) : (
        <LoadingNote />
      )}
      <AddPlayer state={state} post={post} />
      <EventSettings state={state} post={post} />
      <p className="text-sm text-muted">
        <Link href="/stats" className="font-semibold text-ink underline underline-offset-2">
          Back to stats
        </Link>
      </p>
    </div>
  );
}

function useStatus() {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setBusy(true);
    setStatus(null);
    const r = await fn();
    setBusy(false);
    setStatus(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Couldn't save." });
    return r.ok;
  }
  return { status, busy, run };
}

function Status({ status }: { status: { ok: boolean; text: string } | null }) {
  if (!status) return null;
  return (
    <p role="status" className={`mt-2 text-sm font-semibold ${status.ok ? "text-hops" : "text-flag"}`}>
      {status.text}
    </p>
  );
}

const field = "w-full rounded-xl border border-rime bg-white px-3 py-2.5 text-base";

function RosterEditor({
  state,
  pins,
  post,
  onSaved,
}: {
  state: EventState;
  pins: Record<string, string>;
  post: Post;
  onSaved: () => Promise<void>;
}) {
  const course = getCourse(state.event.courseKey);
  const [teams, setTeams] = useState(
    state.teams.map((t) => ({ id: t.id, name: t.name, pin: pins[t.id] ?? "" })),
  );
  const [rows, setRows] = useState(
    state.roster.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      teamId: p.teamId,
      handicap: String(p.handicapIndex),
      source: p.source,
    })),
  );
  const { status, busy, run } = useStatus();

  const patch = (id: number, change: Partial<(typeof rows)[number]>) =>
    setRows((rs) => rs.map((r) => (r.playerId === id ? { ...r, ...change } : r)));

  const preview = (teamId: number) => {
    const idx = rows
      .filter((r) => r.teamId === teamId && Number.isFinite(Number(r.handicap)) && r.handicap.trim() !== "")
      .map((r) => Number(r.handicap));
    return idx.length ? teamHandicap(idx, course).handicap : 0;
  };

  const [w1, w2, w3] = TEAM_WEIGHTS.map((w) => Math.round(w * 100));

  return (
    <section aria-labelledby="roster-h">
      <h2 id="roster-h" className="font-display text-3xl font-extrabold">
        Teams and handicaps
      </h2>
      <p className="mt-1 text-sm text-muted">
        Handicaps only help build even teams. They don&apos;t change scoring: the Cup is gross score to
        par, no strokes. Team handicap is {w1}% of the lowest course handicap, {w2}% of the middle and{" "}
        {w3}% of the highest, using {course.tee} tees ({course.slope} slope, {course.rating} rating).
      </p>
      <p className="mt-2 text-sm text-muted">
        Give each team its own scorer PIN (3 to 12 letters or numbers). A team&apos;s PIN only lets that team
        enter its own scores. The admin PIN can enter scores for any team.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {state.teams.map((t, i) => (
          <div key={t.id} className="rounded-2xl border border-rime bg-glass p-3" style={{ borderTop: `6px solid ${t.color}` }}>
            <label htmlFor={`team-${t.id}`} className="text-sm font-semibold">
              Team name
            </label>
            <input
              id={`team-${t.id}`}
              value={teams[i].name}
              onChange={(e) => setTeams((ts) => ts.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
              className={`${field} mt-1`}
            />
            <label htmlFor={`pin-${t.id}`} className="mt-2 block text-sm font-semibold">
              Scorer PIN
            </label>
            <input
              id={`pin-${t.id}`}
              value={teams[i].pin}
              onChange={(e) => setTeams((ts) => ts.map((x) => (x.id === t.id ? { ...x, pin: e.target.value } : x)))}
              autoComplete="off"
              autoCapitalize="none"
              className={`${field} mt-1`}
            />
            <p className="mt-2 text-sm text-muted">
              Team handicap <span className="font-bold text-ink">{preview(t.id)}</span>
            </p>
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const n = Number(r.handicap);
          const valid = r.handicap.trim() !== "" && Number.isFinite(n);
          return (
            <li key={r.playerId} className="rounded-2xl border border-rime bg-glass p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{r.name}</h3>
                <p className="text-xs text-muted">
                  {valid ? `Course handicap ${courseHandicap(n, course)}` : "Enter a handicap"}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`h-${r.playerId}`} className="text-xs font-semibold text-muted">
                    Handicap index
                  </label>
                  <input
                    id={`h-${r.playerId}`}
                    inputMode="decimal"
                    value={r.handicap}
                    onChange={(e) => patch(r.playerId, { handicap: e.target.value })}
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor={`s-${r.playerId}`} className="text-xs font-semibold text-muted">
                    Source
                  </label>
                  <select
                    id={`s-${r.playerId}`}
                    value={r.source}
                    onChange={(e) => patch(r.playerId, { source: e.target.value })}
                    className={field}
                  >
                    {HANDICAP_SOURCES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label htmlFor={`t-${r.playerId}`} className="text-xs font-semibold text-muted">
                    Team
                  </label>
                  <select
                    id={`t-${r.playerId}`}
                    value={r.teamId ?? ""}
                    onChange={(e) => patch(r.playerId, { teamId: e.target.value === "" ? null : Number(e.target.value) })}
                    className={field}
                  >
                    <option value="">Not on a team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remove ${r.name} from ${state.event.year}?`)) {
                    run(() => post({ action: "removePlayer", eventId: state.event.id, playerId: r.playerId }), `Removed ${r.name}.`);
                  }
                }}
                className="mt-2 text-sm font-semibold text-flag underline underline-offset-2"
              >
                Remove {r.name}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            async () => {
              const r = await post({
                action: "saveRoster",
                eventId: state.event.id,
                teams,
                entries: rows.map((r) => ({
                  playerId: r.playerId,
                  teamId: r.teamId,
                  handicapIndex: r.handicap,
                  source: r.source,
                })),
              });
              if (r.ok) await onSaved();
              return r;
            },
            "Saved.",
          )
        }
        className="press mt-4 w-full rounded-2xl bg-ink px-4 py-4 text-lg font-bold text-frost disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save teams and handicaps"}
      </button>
      <Status status={status} />
    </section>
  );
}

function AddPlayer({ state, post }: { state: EventState; post: Post }) {
  const [name, setName] = useState("");
  const [index, setIndex] = useState("");
  const [source, setSource] = useState<string>("GHIN");
  const { status, busy, run } = useStatus();
  return (
    <section aria-labelledby="add-h">
      <h2 id="add-h" className="font-display text-3xl font-extrabold">
        Add a player
      </h2>
      <form
        className="mt-2 space-y-2 rounded-2xl border border-rime bg-glass p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(
            () => post({ action: "addPlayer", eventId: state.event.id, name, handicapIndex: index, source }),
            `Added ${name}. Put them on a team above.`,
          );
          if (ok) {
            setName("");
            setIndex("");
          }
        }}
      >
        <label htmlFor="new-name" className="text-xs font-semibold text-muted">Name</label>
        <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="new-index" className="text-xs font-semibold text-muted">Handicap index</label>
            <input id="new-index" inputMode="decimal" value={index} onChange={(e) => setIndex(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="new-source" className="text-xs font-semibold text-muted">Source</label>
            <select id="new-source" value={source} onChange={(e) => setSource(e.target.value)} className={field}>
              {HANDICAP_SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || !name.trim() || !index.trim()}
          className="press w-full rounded-xl bg-ink px-4 py-3 font-bold text-frost disabled:opacity-50"
        >
          Add player
        </button>
        <Status status={status} />
      </form>
    </section>
  );
}

function EventSettings({ state, post }: { state: EventState; post: Post }) {
  const nextYear = Math.max(...state.years) + 1;
  const [date, setDate] = useState(state.event.playedOn ?? "");
  const [year, setYear] = useState(String(nextYear));
  const [newDate, setNewDate] = useState("");
  const [teamName, setTeamName] = useState("");
  const a = useStatus();
  const b = useStatus();
  const c = useStatus();
  return (
    <section aria-labelledby="event-h" className="space-y-4">
      <h2 id="event-h" className="font-display text-3xl font-extrabold">
        Event
      </h2>

      <div className="rounded-2xl border border-rime bg-glass p-3">
        <label htmlFor="date" className="text-sm font-semibold">
          {state.event.year} date
        </label>
        <div className="mt-1 flex gap-2">
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          <button
            type="button"
            disabled={a.busy}
            onClick={() => a.run(() => post({ action: "setDate", eventId: state.event.id, playedOn: date }), "Date saved.")}
            className="press rounded-xl bg-ink px-4 font-bold text-frost"
          >
            Save
          </button>
        </div>
        <Status status={a.status} />
      </div>

      <div className="rounded-2xl border border-rime bg-glass p-3">
        <label htmlFor="team-new" className="text-sm font-semibold">
          Add a team to {state.event.year}
        </label>
        <div className="mt-1 flex gap-2">
          <input id="team-new" value={teamName} onChange={(e) => setTeamName(e.target.value)} className={field} />
          <button
            type="button"
            disabled={c.busy || !teamName.trim()}
            onClick={async () => {
              if (await c.run(() => post({ action: "addTeam", eventId: state.event.id, name: teamName }), "Team added.")) setTeamName("");
            }}
            className="press rounded-xl bg-ink px-4 font-bold text-frost disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <Status status={c.status} />
      </div>

      <div className="rounded-2xl border border-rime bg-glass p-3">
        <h3 className="text-sm font-semibold">Start a new year</h3>
        <p className="mt-1 text-sm text-muted">
          Copies the course, team names and last known handicaps. Everyone starts off a team so you
          can rebuild the teams. Past years stay in the history.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="ny" className="text-xs font-semibold text-muted">Year</label>
            <input id="ny" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="nd" className="text-xs font-semibold text-muted">Date</label>
            <input id="nd" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={field} />
          </div>
        </div>
        <button
          type="button"
          disabled={b.busy}
          onClick={() => {
            if (confirm(`Start the ${year} Frozen Beer Cup? The app switches to it right away.`)) {
              b.run(() => post({ action: "newEvent", year, playedOn: newDate }), `${year} is ready. Set the teams above.`);
            }
          }}
          className="press mt-3 w-full rounded-xl bg-ink px-4 py-3 font-bold text-frost disabled:opacity-60"
        >
          Start {year}
        </button>
        <Status status={b.status} />
      </div>
    </section>
  );
}

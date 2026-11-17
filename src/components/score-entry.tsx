"use client";

import { useState } from "react";
import { getCourse } from "@/lib/course";
import { shortNames } from "@/lib/format";
import { computeTeamResult, formatToPar, scoreName } from "@/lib/scoring";
import { useEventState } from "@/lib/use-event-state";
import type { EventState, TeamRow } from "@/lib/types";
import { LoadingNote, PageHeader, SetupNotice } from "./page-header";
import { PinGate } from "./pin-gate";

export function ScoreEntry({
  initial,
  initialError,
}: {
  initial: EventState | null;
  initialError: string | null;
}) {
  const { state, error, refresh } = useEventState(initial, { intervalMs: 10000 });
  if (!state) {
    return error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />;
  }
  return (
    <>
      <PageHeader state={state} title="Enter scores" />
      <PinGate scope="score">
        {(pin, lock) => <Scorer state={state} pin={pin} lock={lock} refresh={refresh} />}
      </PinGate>
    </>
  );
}

function Scorer({
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
  const [teamId, setTeamId] = useState<number | null>(() => {
    try {
      const saved = Number(localStorage.getItem("fbc-team"));
      return state.teams.some((t) => t.id === saved) ? saved : null;
    } catch {
      return null;
    }
  });
  const team = state.teams.find((t) => t.id === teamId) ?? null;

  function pick(t: TeamRow) {
    try {
      localStorage.setItem("fbc-team", String(t.id));
    } catch {}
    setTeamId(t.id);
  }

  return (
    <>
      <div role="group" aria-label="Team" className="mb-4 flex gap-2">
        {state.teams.map((t) => {
          const on = t.id === teamId;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(t)}
              className="press flex-1 rounded-xl border-2 px-2 py-3 font-display text-xl font-extrabold"
              style={{
                borderColor: t.color,
                background: on ? t.color : "transparent",
                color: on ? "#fff" : t.color,
              }}
            >
              {t.name}
            </button>
          );
        })}
      </div>
      {team ? (
        <TeamScorer key={team.id} state={state} team={team} pin={pin} lock={lock} refresh={refresh} />
      ) : (
        <p className="rounded-2xl border border-rime bg-glass p-5 text-sm text-muted">
          Pick your team to start entering scores. The app remembers it on this phone.
        </p>
      )}
    </>
  );
}

function TeamScorer({
  state,
  team,
  pin,
  lock,
  refresh,
}: {
  state: EventState;
  team: TeamRow;
  pin: string;
  lock: () => void;
  refresh: () => Promise<void>;
}) {
  const course = getCourse(state.event.courseKey);
  const result = computeTeamResult(team, state, course);
  const names = shortNames(state.roster);

  const [hole, setHole] = useState(() => {
    const first = result.holes.find((h) => h.gross === null);
    return first ? first.hole : 18;
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const hr = result.holes[hole - 1];
  const existing = state.scores.find((s) => s.teamId === team.id && s.hole === hole) ?? null;

  async function send(method: "POST" | "DELETE", body: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/score", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, eventId: state.event.id, teamId: team.id, hole, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        lock();
        return false;
      }
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Couldn't save. Try again." });
        return false;
      }
      await refresh();
      return true;
    } catch {
      setMsg({
        ok: false,
        text: "No connection. Your score is still here. Tap Save again when you have signal.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function save(gross: number, drivePlayerId: number | null, puttPlayerId: number | null) {
    if (await send("POST", { gross, drivePlayerId, puttPlayerId })) {
      setMsg({ ok: true, text: `Saved hole ${hole}: ${gross}.` });
      if (hole < 18) setHole(hole + 1);
    }
  }

  async function clear() {
    if (await send("DELETE", {})) setMsg({ ok: true, text: `Cleared hole ${hole}.` });
  }

  return (
    <>
      <nav aria-label="Holes" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {result.holes.map((h) => {
          const on = h.hole === hole;
          const done = h.gross !== null;
          return (
            <button
              key={h.hole}
              type="button"
              onClick={() => {
                setHole(h.hole);
                setMsg(null);
              }}
              aria-current={on ? "true" : undefined}
              aria-label={done ? `Hole ${h.hole}, scored ${h.gross}` : `Hole ${h.hole}, not scored`}
              className={`num h-11 w-11 shrink-0 rounded-lg border-2 text-xl ${
                on ? "border-ink bg-ink text-frost" : done ? "border-rime bg-rime text-ink" : "border-rime text-muted"
              }`}
            >
              {h.hole}
            </button>
          );
        })}
      </nav>

      <HoleForm
        key={`${team.id}-${hole}`}
        hr={hr}
        existingGross={existing?.gross ?? null}
        existingDrive={existing?.drivePlayerId ?? null}
        existingPutt={existing?.puttPlayerId ?? null}
        players={result.players.map((p) => ({ id: p.playerId, label: names.get(p.playerId) ?? p.name }))}
        saving={saving}
        onSave={save}
        onClear={clear}
      />

      {msg ? (
        <p
          role="status"
          className={`mt-3 text-sm font-semibold ${msg.ok ? "text-hops" : "text-flag"}`}
        >
          {msg.text}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        {team.name} is {result.thru === 0 ? "not started" : `${formatToPar(result.toPar)} through ${result.thru}`}.
        Scores save to everyone&apos;s leaderboard right away.
      </p>
    </>
  );
}

function HoleForm({
  hr,
  existingGross,
  existingDrive,
  existingPutt,
  players,
  saving,
  onSave,
  onClear,
}: {
  hr: { hole: number; par: number; yards: number; si: number };
  existingGross: number | null;
  existingDrive: number | null;
  existingPutt: number | null;
  players: { id: number; label: string }[];
  saving: boolean;
  onSave: (gross: number, drive: number | null, putt: number | null) => void;
  onClear: () => void;
}) {
  const [gross, setGross] = useState(existingGross ?? hr.par);
  const [drive, setDrive] = useState<number | null>(existingDrive);
  const [putt, setPutt] = useState<number | null>(existingPutt);
  const quick = Array.from({ length: 6 }, (_, i) => hr.par - 2 + i).filter((n) => n >= 1);

  return (
    <section className="rounded-2xl border border-rime bg-glass p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-5xl font-extrabold leading-none">Hole {hr.hole}</h2>
          <p className="mt-1.5 text-sm text-muted">
            Par {hr.par}, {hr.yards} yards
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <button
          type="button"
          aria-label="One less"
          onClick={() => setGross((g) => Math.max(1, g - 1))}
          className="press h-16 w-16 rounded-2xl border-2 border-ink text-4xl font-bold leading-none"
        >
          &minus;
        </button>
        <div className="w-28 text-center" aria-live="polite">
          <div className="num text-[7rem] leading-[0.85]">{gross}</div>
        </div>
        <button
          type="button"
          aria-label="One more"
          onClick={() => setGross((g) => Math.min(15, g + 1))}
          className="press h-16 w-16 rounded-2xl border-2 border-ink text-4xl font-bold leading-none"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-center text-sm font-semibold">
        {scoreName(gross, hr.par)}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {quick.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setGross(n)}
            aria-pressed={gross === n}
            className={`press rounded-xl border-2 px-2 py-2 ${
              gross === n ? "border-ink bg-ink text-frost" : "border-rime"
            }`}
          >
            <span className="num block text-2xl leading-none">{n}</span>
            <span className="text-xs">{scoreName(n, hr.par)}</span>
          </button>
        ))}
      </div>

      <PlayerPick legend="Whose drive did you use?" players={players} value={drive} onChange={setDrive} />
      <PlayerPick legend="Who sank the putt?" players={players} value={putt} onChange={setPutt} />

      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(gross, drive, putt)}
        className="press mt-6 w-full rounded-2xl bg-ink px-4 py-4 text-lg font-bold text-frost disabled:opacity-60"
      >
        {saving ? "Saving…" : existingGross === null ? `Save hole ${hr.hole}` : `Update hole ${hr.hole}`}
      </button>
      {existingGross !== null ? (
        <button
          type="button"
          disabled={saving}
          onClick={onClear}
          className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-flag underline underline-offset-2"
        >
          Clear hole {hr.hole}
        </button>
      ) : null}
    </section>
  );
}

function PlayerPick({
  legend,
  players,
  value,
  onChange,
}: {
  legend: string;
  players: { id: number; label: string }[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  if (players.length === 0) return null;
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">
        {legend} <span className="font-normal text-muted">Optional, feeds the stats.</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={value === p.id}
            onClick={() => onChange(value === p.id ? null : p.id)}
            className={`press rounded-full border-2 px-4 py-2.5 text-base font-semibold ${
              value === p.id ? "border-ink bg-ink text-frost" : "border-rime"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

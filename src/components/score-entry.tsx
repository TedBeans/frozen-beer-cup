"use client";

import { useState } from "react";
import { getCourse } from "@/lib/course";
import { playerNames } from "@/lib/format";
import Link from "next/link";
import { computeLeaderboard, computeTeamResult, formatToPar, scoreName } from "@/lib/scoring";
import { useEventState } from "@/lib/use-event-state";
import type { EventState, TeamRow } from "@/lib/types";
import { LoadingNote, SetupNotice } from "./page-header";
import { HoleMap } from "./hole-map";
import { PinGate, useMounted } from "./pin-gate";
import { RoundTrace } from "./round-trace";
import { StandingsStrip } from "./standings-strip";
import { Logo } from "./logo";

export function ScoreEntry({
  initial,
  initialError,
}: {
  initial: EventState | null;
  initialError: string | null;
}) {
  const { state, error, refresh } = useEventState(initial, { intervalMs: 10000 });
  const mounted = useMounted();
  if (!state) {
    return error || initialError ? <SetupNotice error={error ?? initialError} /> : <LoadingNote />;
  }
  return mounted ? <Scorer state={state} refresh={refresh} /> : <LoadingNote />;
}

function Scorer({ state, refresh }: { state: EventState; refresh: () => Promise<void> }) {
  const [teamId, setTeamId] = useState<number | null>(() => {
    try {
      const saved = Number(localStorage.getItem("fbc-team"));
      return state.teams.some((t) => t.id === saved) ? saved : null;
    } catch {
      return null;
    }
  });
  const team = state.teams.find((t) => t.id === teamId) ?? null;
  const [sheet, setSheet] = useState(false);

  function pick(t: TeamRow | null) {
    try {
      if (t) localStorage.setItem("fbc-team", String(t.id));
      else localStorage.removeItem("fbc-team");
    } catch {}
    setTeamId(t ? t.id : null);
  }

  if (!team) {
    return (
      <>
        <Logo size={72} />
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95]">Who are you scoring for?</h1>
        <p className="mt-2 text-sm text-muted">
          Pick once. This phone opens straight to your team next time, and asks for your team&apos;s PIN.
        </p>
        <div className="mt-5 space-y-3">
          {state.teams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t)}
              className="press block w-full rounded-2xl px-5 py-5 text-left text-white"
              style={{ background: t.color }}
            >
              <span className="block font-display text-4xl font-extrabold leading-none">{t.name}</span>
              <span className="mt-2 block text-sm opacity-95">
                {state.roster
                  .filter((p) => p.teamId === t.id)
                  .map((p) => p.name.trim())
                  .join(", ") || "No players yet"}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm">
          Just watching?{" "}
          <Link href="/?watch" className="font-semibold underline underline-offset-2">
            See the feed
          </Link>
        </p>
      </>
    );
  }

  const board = computeLeaderboard(state);
  return (
    <>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold">
        <Link href="/?watch" className="underline underline-offset-2">
          &larr; Feed
        </Link>
        <button type="button" onClick={() => pick(null)} className="underline underline-offset-2">
          Switch team
        </button>
      </div>
      <PinGate key={team.id} target={{ teamId: team.id, name: team.name }}>
        {(pin, lock) => <TeamScorer state={state} team={team} pin={pin} lock={lock} refresh={refresh} />}
      </PinGate>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rime bg-glass/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pb-2 pt-1.5">
          <div className="mx-auto mb-1.5 h-1.5 w-11 rounded-full bg-rime" aria-hidden="true" />
          <StandingsStrip board={board} onClick={() => setSheet(true)} />
        </div>
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-ink/45" onClick={() => setSheet(false)}>
          <div
            role="dialog"
            aria-label="Standings"
            className="max-h-[75dvh] overflow-y-auto rounded-t-3xl bg-frost px-4 pb-8 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-rime" aria-hidden="true" />
            <div className="mx-auto max-w-2xl">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-4xl font-extrabold">Standings</h2>
                <button type="button" onClick={() => setSheet(false)} className="press rounded-lg border border-ink px-3 py-1.5 text-sm font-bold">
                  Close
                </button>
              </div>
              <ol className="mt-3 space-y-3">
                {board.map((r) => (
                  <li key={r.team.id} className="rounded-2xl border border-rime bg-glass p-3" style={{ borderLeft: `8px solid ${r.team.color}` }}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-2xl font-extrabold">{r.team.name}</span>
                      <span className="num text-5xl leading-none">{r.thru > 0 ? formatToPar(r.toPar) : "–"}</span>
                    </div>
                    <RoundTrace holes={r.holes} color={r.team.color} />
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm">
                <Link href="/card" className="font-semibold underline underline-offset-2">
                  Full scorecards
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}
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
  const names = playerNames(state.roster);

  const [hole, setHole] = useState(() => {
    const first = result.holes.find((h) => h.gross === null);
    return first ? first.hole : 18;
  });
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(() => {
    try {
      return localStorage.getItem("fbc-map") !== "off";
    } catch {
      return true;
    }
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [undo, setUndo] = useState<{
    hole: number;
    prev: { gross: number; drivePlayerId: number | null; puttPlayerId: number | null } | null;
  } | null>(null);

  const hr = result.holes[hole - 1];
  const existing = state.scores.find((s) => s.teamId === team.id && s.hole === hole) ?? null;

  async function send(method: "POST" | "DELETE", body: Record<string, unknown>, forHole = hole) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/score", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, eventId: state.event.id, teamId: team.id, hole: forHole, ...body }),
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
    const prev = existing
      ? { gross: existing.gross, drivePlayerId: existing.drivePlayerId, puttPlayerId: existing.puttPlayerId }
      : null;
    if (await send("POST", { gross, drivePlayerId, puttPlayerId })) {
      setMsg({ ok: true, text: `Saved hole ${hole}: ${gross}.` });
      setUndo({ hole, prev });
      if (hole < 18) setHole(hole + 1);
    }
  }

  async function clear() {
    if (await send("DELETE", {})) {
      setMsg({ ok: true, text: `Cleared hole ${hole}.` });
      setUndo(null);
    }
  }

  async function doUndo() {
    if (!undo) return;
    const ok = undo.prev ? await send("POST", undo.prev, undo.hole) : await send("DELETE", {}, undo.hole);
    if (ok) {
      setHole(undo.hole);
      setMsg({ ok: true, text: `Undid hole ${undo.hole}.` });
      setUndo(null);
    }
  }

  return (
    <>
      <section className="mb-3 overflow-hidden rounded-2xl border border-rime bg-glass">
        {showMap ? (
          <div className="relative">
            <HoleMap hole={course.holes[hole - 1]} replayKey={hole} maxHeight="30dvh" />
            <div className="absolute left-2.5 top-2.5 rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: team.color }}>
              {team.name}
            </div>
            <div className="absolute bottom-2.5 left-2.5 rounded-xl bg-ink/90 px-3 py-1.5 text-frost">
              <span className="num text-xl">Par {hr.par}</span> <span className="text-sm">&middot; {hr.yards} yds</span>
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <p className="text-sm font-semibold">
            Hole {hr.hole} <span className="font-normal text-muted">of 18</span>
            {showMap ? null : <span className="font-normal text-muted"> &middot; par {hr.par}, {hr.yards} yards</span>}
          </p>
          <button
            type="button"
            aria-expanded={showMap}
            onClick={() => {
              const next = !showMap;
              setShowMap(next);
              try {
                localStorage.setItem("fbc-map", next ? "on" : "off");
              } catch {}
            }}
            className="press rounded-lg border border-rime px-3 py-1.5 text-sm font-bold"
          >
            {showMap ? "Hide map" : "Show map"}
          </button>
        </div>
      </section>

      <nav aria-label="Holes" className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
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
              className={`num h-10 w-10 shrink-0 rounded-lg border-2 text-lg ${
                on ? "border-ink bg-ink text-frost" : done ? "border-rime bg-rime text-ink" : "border-rime text-muted"
              }`}
            >
              {h.hole}
            </button>
          );
        })}
      </nav>

      <Keypad
        key={`${team.id}-${hole}`}
        hr={hr}
        existingGross={existing?.gross ?? null}
        players={result.players.map((p) => ({ id: p.playerId, label: names.get(p.playerId) ?? p.name }))}
        saving={saving}
        onSave={save}
        onClear={clear}
      />

      {msg ? (
        <p role="status" className={`mt-3 flex items-center gap-3 text-sm font-semibold ${msg.ok ? "text-hops" : "text-flag"}`}>
          <span>{msg.text}</span>
          {msg.ok && undo ? (
            <button type="button" onClick={doUndo} className="press rounded-lg border-2 border-ink px-3 py-1 text-ink">
              Undo
            </button>
          ) : null}
        </p>
      ) : null}

      <p className="mt-5 text-sm text-muted">
        {team.name} is {result.thru === 0 ? "not started" : `${formatToPar(result.toPar)} through ${result.thru}`}.
        Scores save to everyone&apos;s feed right away.
      </p>
    </>
  );
}

function Keypad({
  hr,
  existingGross,
  players,
  saving,
  onSave,
  onClear,
}: {
  hr: { hole: number; par: number; yards: number; si: number };
  existingGross: number | null;
  players: { id: number; label: string }[];
  saving: boolean;
  onSave: (gross: number, drive: number | null, putt: number | null) => void;
  onClear: () => void;
}) {
  const [more, setMore] = useState(false);
  const [extras, setExtras] = useState(false);
  const [drive, setDrive] = useState<number | null>(null);
  const [putt, setPutt] = useState<number | null>(null);
  const start = Math.max(1, hr.par - 2);
  const nums = more ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 6 }, (_, i) => start + i);

  return (
    <section className="rounded-2xl border border-rime bg-glass p-4">
      <h2 className="font-display text-3xl font-extrabold leading-none">What did you make?</h2>
      <p className="mt-1 text-sm text-muted">
        {existingGross === null
          ? "One tap saves and moves to the next hole."
          : `Hole ${hr.hole} is saved as ${existingGross}. Tap a number to change it.`}
      </p>

      <div className={`mt-3 grid gap-2 ${more ? "grid-cols-4" : "grid-cols-3"}`}>
        {nums.map((n) => {
          const isPar = n === hr.par;
          const current = n === existingGross;
          return (
            <button
              key={n}
              type="button"
              disabled={saving}
              onClick={() => onSave(n, drive, putt)}
              aria-label={`${n}, ${scoreName(n, hr.par)}`}
              className={`press flex ${more ? "h-16" : "h-[4.5rem]"} flex-col items-center justify-center rounded-2xl border-2 disabled:opacity-60 ${
                current ? "border-ink bg-ink text-frost" : isPar ? "border-ink" : "border-rime"
              }`}
            >
              <span className="num text-4xl leading-none">{n}</span>
              <span className="mt-0.5 text-[11px]">{scoreName(n, hr.par)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setMore((m) => !m)} className="press rounded-xl border-2 border-rime px-3 py-3 text-sm font-bold">
          {more ? "Fewer numbers" : "Other score"}
        </button>
        <button type="button" aria-expanded={extras} onClick={() => setExtras((x) => !x)} className="press rounded-xl border-2 border-rime px-3 py-3 text-sm font-bold">
          {extras ? "Hide drive and putt" : "Add drive and putt"}
        </button>
      </div>

      {extras ? (
        <>
          <PlayerPick legend="Whose drive did you use?" players={players} value={drive} onChange={setDrive} />
          <PlayerPick legend="Who sank the putt?" players={players} value={putt} onChange={setPutt} />
          <p className="mt-2 text-xs text-muted">Pick these first, then tap the number.</p>
        </>
      ) : null}

      {existingGross !== null ? (
        <button
          type="button"
          disabled={saving}
          onClick={onClear}
          className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-flag underline underline-offset-2"
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

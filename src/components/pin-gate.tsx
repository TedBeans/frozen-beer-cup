"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Logo } from "./logo";

const noopSubscribe = () => () => {};

/** True once the page has hydrated, so localStorage reads can't mismatch the server HTML. */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** "admin" unlocks the admin page; a team target unlocks scoring for that one team. */
export type PinTarget = "admin" | { teamId: number; name: string };

export function PinGate({
  target,
  children,
}: {
  target: PinTarget;
  children: (pin: string, lock: () => void) => ReactNode;
}) {
  const mounted = useMounted();
  if (!mounted) return <p className="py-10 text-center text-sm text-muted">Loading…</p>;
  return <Gate target={target}>{children}</Gate>;
}

function Gate({
  target,
  children,
}: {
  target: PinTarget;
  children: (pin: string, lock: () => void) => ReactNode;
}) {
  const isAdmin = target === "admin";
  const teamName = isAdmin ? "" : target.name;
  const storageKey = isAdmin ? "fbc-pin-admin" : `fbc-pin-team-${target.teamId}`;
  const [pin, setPin] = useState<string | null>(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function lock() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setPin(null);
    setError("That PIN no longer works. Enter it again.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isAdmin ? { pin: draft, scope: "admin" } : { pin: draft, teamId: target.teamId },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't check the PIN.");
        return;
      }
      try {
        localStorage.setItem(storageKey, draft.trim());
      } catch {}
      setPin(draft.trim());
    } catch {
      setError("No connection. Try again when you have signal.");
    } finally {
      setBusy(false);
    }
  }

  if (pin) return <>{children(pin, lock)}</>;

  return (
    <form onSubmit={submit} className="rounded-2xl border border-rime bg-glass p-5">
      <Logo size={56} className="mb-2" />
      <h1 className="font-display text-4xl font-extrabold">
        {isAdmin ? "Admin PIN" : `${teamName} team PIN`}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {isAdmin
          ? "Needed to change teams, handicaps and events."
          : `This PIN only unlocks scoring for ${teamName}. Anyone can watch the leaderboard without it.`}
      </p>
      <label htmlFor="pin" className="mt-4 block text-sm font-semibold">
        PIN
      </label>
      <input
        id="pin"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        className="mt-1 w-full rounded-xl border border-rime bg-white px-4 py-3 text-lg"
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-flag">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !draft.trim()}
        className="press mt-4 w-full rounded-xl bg-ink px-4 py-3.5 text-base font-bold text-frost disabled:opacity-50"
      >
        {busy ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}

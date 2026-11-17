"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventState } from "./types";

type Options = { year?: number; intervalMs?: number };

/** Polls /api/state so every phone sees new scores within a few seconds. */
export function useEventState(initial: EventState | null, options: Options = {}) {
  const { year, intervalMs = 5000 } = options;
  const [state, setState] = useState<EventState | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/state${year ? `?year=${year}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load scores.");
      setState(data);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Offline");
    }
  }, [year]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    if (intervalMs <= 0) return () => clearTimeout(first);
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, intervalMs]);

  return { state, error, updatedAt, refresh };
}

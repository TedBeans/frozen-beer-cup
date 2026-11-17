"use client";

import { useCallback, useEffect, useState } from "react";
import type { EventState } from "./types";

export function useHistory(initial: EventState[], intervalMs = 15000) {
  const [states, setStates] = useState<EventState[]>(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load stats.");
      setStates(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Offline");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
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

  return { states, error };
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(err: unknown, status = 500): Response {
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return json({ error: message }, status);
}

export function int(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : null;
}

export function optionalInt(v: unknown): number | null {
  return v === null || v === undefined || v === "" ? null : int(v);
}

import { getCourse } from "@/lib/course";
import { formatDate } from "@/lib/format";
import type { EventState } from "@/lib/types";

export function PageHeader({
  state,
  title,
  note,
}: {
  state: EventState;
  title?: string;
  note?: React.ReactNode;
}) {
  const course = getCourse(state.event.courseKey);
  const date = formatDate(state.event.playedOn);
  return (
    <header className="mb-5">
      <h1 className="font-display text-5xl font-extrabold leading-[0.95] text-ink">
        {title ?? state.event.title}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {course.name}, {course.tee} tees{date ? `. ${date}.` : "."}
      </p>
      {note ? <div className="mt-1 text-sm text-muted">{note}</div> : null}
    </header>
  );
}

export function SetupNotice({ error }: { error: string | null }) {
  return (
    <section className="rounded-2xl border border-rime bg-glass p-5">
      <h1 className="font-display text-4xl font-extrabold">Scores aren&apos;t loading</h1>
      <p className="mt-2 text-sm text-muted">
        {error ?? "The app couldn't reach its database."}
      </p>
      <p className="mt-3 text-sm">
        First deploy? Add a Neon Postgres database to the Vercel project, set{" "}
        <code className="rounded bg-frost px-1">SCORER_PIN</code>, then redeploy. The README walks
        through it.
      </p>
    </section>
  );
}

export function LoadingNote() {
  return <p className="py-10 text-center text-sm text-muted">Loading scores…</p>;
}

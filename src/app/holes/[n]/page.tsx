import { notFound } from "next/navigation";
import { HoleDetail } from "@/components/hole-detail";
import { loadInitial } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export default async function HolePage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const hole = Number(n);
  if (!Number.isInteger(hole) || hole < 1 || hole > 18) notFound();
  const { state, error } = await loadInitial();
  return <HoleDetail hole={hole} initial={state} initialError={error} />;
}

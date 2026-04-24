/**
 * Plain-text formatter for update-refs results.
 */

import type { UpdateResult } from "../operations/updateRefs.js";

const KIND_LABELS: Record<UpdateResult["kind"], string> = {
  cloned: "cloned",
  updated: "updated",
  "up-to-date": "up to date",
  ok: "ok",
  skipped: "skipped",
  error: "ERROR",
};

export default function formatUpdateResults(
  results: ReadonlyArray<UpdateResult>,
): string {
  if (results.length === 0) return "No packages configured.";

  const lines: string[] = [];
  for (const r of results) {
    const label = KIND_LABELS[r.kind] ?? r.kind;
    lines.push(`${r.pkg}: ${label} — ${r.detail}`);
  }
  return lines.join("\n");
}

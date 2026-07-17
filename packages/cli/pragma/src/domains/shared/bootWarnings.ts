/**
 * Unified boot-warning channel.
 *
 * Data-layer problems discovered while booting the store (malformed TTL
 * sources today; other source-level diagnostics tomorrow) are *recorded*
 * here instead of being written to stderr at the point of discovery.
 * After boot, the entry point flushes them once:
 *
 * - default: a single summary line naming the skipped files, pointing at
 *   `pragma doctor` for the full parser errors
 * - `--verbose`: one full line per warning (path + parser reason)
 * - `pragma doctor`: renders the collected warnings as structured
 *   sub-items of the ke-store check
 *
 * The accumulator is module-level (like the bundled-loader cache): a CLI
 * process boots at most a handful of stores, and each flush drains what
 * was recorded so repeated boots (e.g. doctor's own store) never
 * double-report.
 */

import { basename } from "node:path";

/** A single boot-time data warning. */
export interface BootWarning {
  /** Warning category (only malformed sources today). */
  readonly kind: "malformed-graph";
  /** Path of the offending source. */
  readonly subject: string;
  /** Underlying reason (e.g. the Turtle parser error). */
  readonly detail: string;
}

let warnings: BootWarning[] = [];

/** Record a warning for the next flush. Deduplicates by subject. */
export function recordBootWarning(warning: BootWarning): void {
  if (!warnings.some((w) => w.subject === warning.subject)) {
    warnings.push(warning);
  }
}

/** Drain all recorded warnings (empties the accumulator). */
export function drainBootWarnings(): BootWarning[] {
  const drained = warnings;
  warnings = [];
  return drained;
}

/** Test-only: reset the accumulator. */
export function clearBootWarnings(): void {
  warnings = [];
}

/**
 * Render drained warnings for stderr.
 *
 * @param drained - Warnings from {@link drainBootWarnings}.
 * @param verbose - Full per-warning lines instead of the summary.
 * @returns The text to write to stderr, or `""` when nothing to report.
 */
export function renderBootWarnings(
  drained: readonly BootWarning[],
  verbose: boolean,
): string {
  if (drained.length === 0) return "";

  if (verbose) {
    return `${drained
      .map(
        (w) =>
          `Warning: skipping malformed graph "${w.subject}" — ${w.detail}. ` +
          "Check the TTL syntax of this source file; the remaining graphs still load.",
      )
      .join("\n")}\n`;
  }

  const names = drained.map((w) => basename(w.subject));
  const shown = names.slice(0, 3).join(", ");
  const extra = names.length > 3 ? ` (+${names.length - 3} more)` : "";
  const plural = drained.length === 1 ? "source" : "sources";
  return (
    `Warning: skipped ${drained.length} malformed data ${plural}: ${shown}${extra} — ` +
    "the remaining graphs still load. Run `pragma doctor` for details.\n"
  );
}

/**
 * Drain and write the collected warnings to stderr in one shot.
 * The standard flush used by CLI and MCP entry points after boot.
 */
export function flushBootWarnings(verbose: boolean): void {
  const text = renderBootWarnings(drainBootWarnings(), verbose);
  if (text) process.stderr.write(text);
}

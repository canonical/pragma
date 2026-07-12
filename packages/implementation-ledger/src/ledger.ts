import { parseLedger } from "./parseLedger.js";
import {
  serializeEntry,
  serializeEntryBody,
  serializePreamble,
} from "./serializeLedger.js";
import type { LedgerEntry, LedgerMismatch, LedgerPrefix } from "./types.js";

/** Key uniquely identifying a ledger entry */
export function entryKey(entry: {
  packageName: string;
  packageVersion: string;
}): string {
  return `${entry.packageName}@${entry.packageVersion}`;
}

/**
 * Two entries are equal when their deterministic serializations are equal —
 * i.e. same package, same version, and the same set of made-available blocks
 * (URI, version, symbol, import statement, verification and draft flags).
 */
export function entriesEqual(
  a: LedgerEntry,
  b: LedgerEntry,
  prefix: LedgerPrefix,
): boolean {
  return serializeEntryBody(a, prefix) === serializeEntryBody(b, prefix);
}

export interface AppendResult {
  /** New file content (existing bytes untouched, new stanzas appended) */
  content: string;

  /** Entries appended by this run */
  appended: LedgerEntry[];

  /** Entries skipped because an identical entry is already recorded */
  skipped: LedgerEntry[];

  /**
   * (package, version) pairs already recorded with DIFFERENT content.
   * A non-empty list is an integrity violation: callers must fail loudly and
   * must not write {@link content}.
   */
  mismatches: LedgerMismatch[];
}

export interface AppendOptions {
  prefix: LedgerPrefix;

  /** Reproducible provenance string (e.g. "git cdc725d (2026-07-08)") */
  recordedAt?: string;
}

/**
 * Compute the result of appending `entries` to an existing ledger.
 *
 * Invariants:
 * - Append-only: `existingContent` is preserved byte-for-byte; new stanzas
 *   are only ever added after it.
 * - Idempotent: an entry whose (package, version) pair is already recorded
 *   with identical content is skipped silently.
 * - Integrity: an entry whose (package, version) pair is already recorded
 *   with different content is reported as a mismatch. Callers must treat any
 *   mismatch as a hard failure.
 *
 * This function performs no I/O; the CLI owns reading/writing the file.
 */
export function appendEntries(
  existingContent: string | undefined,
  entries: LedgerEntry[],
  options: AppendOptions,
): AppendResult {
  const { prefix, recordedAt } = options;

  const hasExisting =
    existingContent !== undefined && existingContent.trim() !== "";
  const recorded = new Map<string, LedgerEntry>();
  if (hasExisting) {
    for (const entry of parseLedger(existingContent, prefix)) {
      recorded.set(entryKey(entry), entry);
    }
  }

  const result: AppendResult = {
    content: hasExisting ? existingContent : serializePreamble(prefix),
    appended: [],
    skipped: [],
    mismatches: [],
  };

  const stanzas: string[] = [];
  for (const entry of entries) {
    const key = entryKey(entry);
    const existing = recorded.get(key);

    if (existing === undefined) {
      stanzas.push(serializeEntry(entry, prefix, recordedAt));
      recorded.set(key, entry);
      result.appended.push(entry);
    } else if (entriesEqual(existing, entry, prefix)) {
      result.skipped.push(entry);
    } else {
      result.mismatches.push({ key, recorded: existing, computed: entry });
    }
  }

  if (stanzas.length > 0) {
    const separator = result.content.endsWith("\n") ? "\n" : "\n\n";
    result.content += separator + stanzas.join("\n");
  }

  return result;
}

/**
 * Human-readable explanation of a mismatch, for loud failures.
 */
export function describeMismatch(
  mismatch: LedgerMismatch,
  prefix: LedgerPrefix,
): string {
  return [
    `ledger integrity violation for ${mismatch.key}:`,
    "  this (package, version) pair is already recorded with different content.",
    "  A version's recorded implementations are immutable. If the implementation",
    "  surface changed, bump the package version (the release flow appends a new",
    "  entry for the new version). Never rewrite ledger history.",
    "  --- recorded ---",
    ...serializeEntryBody(mismatch.recorded, prefix)
      .split("\n")
      .map((l) => `  ${l}`),
    "  --- computed from current sources ---",
    ...serializeEntryBody(mismatch.computed, prefix)
      .split("\n")
      .map((l) => `  ${l}`),
  ].join("\n");
}

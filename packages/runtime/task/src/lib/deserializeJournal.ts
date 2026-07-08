import type { Effect, EffectId, Journal, JournalOutcome } from "./types.js";

/**
 * Parse a {@link Journal} from the JSON string produced by
 * {@link serializeJournal}, failing closed with a `TypeError` when the text is
 * not a well-formed journal — so a corrupt or foreign file can never drive
 * replay with garbage entries.
 *
 * Validation is structural and deep: every entry must carry a well-typed
 * {@link EffectId} and an outcome that is either `{ ok: true }` (a success) or
 * `{ ok: false }` with a `TaskError`-shaped `error`. A success `value` may be
 * absent only for a kind whose result can be `undefined`; a `ReadFile`/`Exec`/
 * `Exists`/`Glob` success with no recorded value is corrupt and rejected here
 * rather than replaying silently as `undefined`.
 *
 * @param text - The serialised journal.
 * @returns The parsed journal.
 * @throws TypeError When the text is not valid JSON or not a journal shape.
 */
export default function deserializeJournal(text: string): Journal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new TypeError("deserializeJournal: input is not valid JSON");
  }
  if (!isJournal(parsed)) {
    throw new TypeError(
      "deserializeJournal: input is not a well-formed journal",
    );
  }
  return parsed;
}

/**
 * Effect kinds whose successful result is never `undefined`, so a success entry
 * for one of them must carry a `value`. Void effects (their result is
 * `undefined`) and `ReadContext`/`Prompt` (which can legitimately yield
 * `undefined`) are deliberately absent, so a missing value stays valid for them.
 */
const ALWAYS_VALUED: ReadonlySet<Effect["_tag"]> = new Set([
  "ReadFile",
  "Exists",
  "Glob",
  "Exec",
]);

/** Narrow an unknown parse result to the {@link Journal} shape replay relies on. */
function isJournal(value: unknown): value is Journal {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.every(isJournalEntry)
  );
}

/** Validate one entry: a well-typed effect id plus a discriminated outcome. */
function isJournalEntry(value: unknown): boolean {
  if (!isRecord(value) || !isEffectId(value.id) || !isOutcome(value.outcome)) {
    return false;
  }
  // A success value that was `undefined` serialises to no `value` key; that is
  // only legitimate for a kind whose result can be undefined, so an always-valued
  // kind with no recorded value is corrupt.
  return !(
    value.outcome.ok &&
    !("value" in value.outcome) &&
    ALWAYS_VALUED.has(value.id.kind)
  );
}

/** Validate an {@link EffectId}: the four primitive identity fields. */
function isEffectId(value: unknown): value is EffectId {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    typeof value.content === "string" &&
    typeof value.branch === "string" &&
    typeof value.seq === "number"
  );
}

/**
 * Validate a {@link JournalOutcome} discriminant: `ok` must be a boolean, and a
 * failure must carry a `TaskError`-shaped error. A success value may be absent
 * here; {@link isJournalEntry} enforces its presence for always-valued kinds.
 */
function isOutcome(value: unknown): value is JournalOutcome {
  if (!isRecord(value) || typeof value.ok !== "boolean") {
    return false;
  }
  return value.ok || isTaskError(value.error);
}

/** Validate the minimal `TaskError` shape replay reconstructs a failure from. */
function isTaskError(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

/** Test whether a value is a non-null object usable as a property bag. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

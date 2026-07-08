import type { Journal } from "./types.js";

/**
 * Parse a {@link Journal} from the JSON string produced by
 * {@link serializeJournal}, failing closed with a `TypeError` when the text is
 * not a well-formed journal — so a corrupt or foreign file can never drive
 * replay with garbage entries.
 *
 * Validation is structural and deep: every entry must carry a well-typed
 * {@link EffectId} and an outcome that is either `{ ok: true }` (a success,
 * whose value may be absent when it was `undefined`) or `{ ok: false }` with a
 * `TaskError`-shaped `error`. A shape-valid but semantically malformed entry is
 * rejected here rather than detonating mid-replay.
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
  return isRecord(value) && isEffectId(value.id) && isOutcome(value.outcome);
}

/** Validate an {@link EffectId}: the four primitive identity fields. */
function isEffectId(value: unknown): boolean {
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
 * (an `undefined` result serialises to no `value` key), so it is not required.
 */
function isOutcome(value: unknown): boolean {
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

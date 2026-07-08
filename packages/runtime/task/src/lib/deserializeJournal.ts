import type { Journal } from "./types.js";

/**
 * Parse a {@link Journal} from the JSON string produced by
 * {@link serializeJournal}, failing closed with a `TypeError` when the text is
 * not a well-formed journal — so a corrupt or foreign file can never drive
 * replay with garbage entries.
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
    value.entries.every(
      (entry) =>
        isRecord(entry) && isRecord(entry.id) && isRecord(entry.outcome),
    )
  );
}

/** Test whether a value is a non-null object usable as a property bag. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

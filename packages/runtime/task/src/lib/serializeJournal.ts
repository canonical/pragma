import type { Journal } from "./types.js";

/**
 * Serialise a {@link Journal} to a JSON string for persistence between runs.
 *
 * The output is a plain JSON encoding of the ordered entries — each carrying an
 * {@link EffectId} and its recorded outcome — and round-trips through
 * {@link deserializeJournal}. Effect outcomes must be JSON-representable (as the
 * built-in effects' results are); a recorded failure keeps only its `code` and
 * `message`.
 *
 * @param journal - The journal to serialise.
 * @returns A JSON string that {@link deserializeJournal} can parse back.
 */
export default function serializeJournal(journal: Journal): string {
  return JSON.stringify(journal);
}

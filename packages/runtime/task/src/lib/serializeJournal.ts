import type { Journal } from "./types.js";

/**
 * Serialise a {@link Journal} to a JSON string for persistence between runs.
 *
 * The output is a plain JSON encoding of the ordered entries — each carrying an
 * {@link EffectId} and its recorded outcome — and round-trips through
 * {@link deserializeJournal}. A journal from {@link recordTask}/{@link replayTask}
 * is always JSON-representable: a success value that would not survive the round
 * trip fails closed at record time, and a failure keeps only its `code` and
 * `message`.
 *
 * @param journal - The journal to serialise.
 * @returns A JSON string that {@link deserializeJournal} can parse back.
 */
export default function serializeJournal(journal: Journal): string {
  return JSON.stringify(journal);
}

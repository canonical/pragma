import { describeError } from "../source/index.js";
import { WRITE_DEADLINE, WRITE_DELAY } from "./constants.js";
import spellTargetKey from "./spellTargetKey.js";
import type {
  JsonValue,
  KeptLayer,
  PreferenceWriter,
  PreferenceWriterConfig,
} from "./types.js";

/** A change gathering to be written: its target's layer and the merged patch. */
type Gathered = KeptLayer & {
  readonly patch: Record<string, JsonValue | undefined>;
};

/**
 * Create the write-behind every presentation change goes through. A change
 * is applied to its layer at once and gathered by target; the gathered
 * patches are written `WRITE_DELAY` after the last change of a burst, or
 * `WRITE_DEADLINE` after its first while changes keep coming, and on
 * demand through `flush`. Each key is marked sent, then
 * written or failed — only while the change that sent it still owns the
 * key — and the presentation is told to publish after every settlement. A
 * write the store answers `missing` is final: the view is gone, so the
 * change is neither kept nor retried, and the presentation forgets it.
 *
 * @note Impure by design: the writer holds the changes gathering to be
 * written and the timer that writes them, and reads the clock.
 */
export default function createPreferenceWriter(
  config: PreferenceWriterConfig,
): PreferenceWriter {
  const { store, publish, forget } = config;
  /** Changes not yet written, merged by target. */
  const queued = new Map<string, Gathered>();
  let changes = 0;
  /** The last change a flush has sent. */
  let flushed = 0;
  /** Why the latest failed write failed. */
  let failure = "";
  let flushing: ReturnType<typeof setTimeout> | null = null;
  /** When the changes now gathering must be written, whatever else comes. */
  let deadline = 0;

  const flush = (): void => {
    flushed = changes;
    if (flushing !== null) {
      clearTimeout(flushing);
      flushing = null;
    }
    for (const { layer, target, patch } of queued.values()) {
      // Each key as written; a change made since owns the key now.
      const written = Object.keys(patch).map(
        (key) => [key, layer.readChangeToken(key)] as const,
      );
      layer.markSent(Object.keys(patch));
      const settle = (reason: string | null): void => {
        const kept = written
          .filter(([key, token]) => layer.readChangeToken(key) === token)
          .map(([key]) => key);
        if (reason === null) {
          layer.markWritten(kept);
        } else {
          layer.markFailed(kept);
          failure = reason;
        }
        publish();
      };
      void store.patchPresentation(target, patch).then(
        (result) => {
          if (result.status === "missing") {
            forget(target);
          }
          settle(null);
        },
        (error: unknown) => {
          settle(describeError(error));
        },
      );
    }
    queued.clear();
  };

  const persist: PreferenceWriter["persist"] = ({ layer, target }, patch) => {
    const token = ++changes;
    const key = spellTargetKey(target);
    const gathered = queued.get(key)?.patch ?? {};
    layer.change(patch, token);
    Object.assign(gathered, patch);
    queued.set(key, { layer, target, patch: gathered });
    const now = Date.now();
    if (flushing === null) {
      deadline = now + WRITE_DEADLINE;
    } else {
      clearTimeout(flushing);
    }
    flushing = setTimeout(flush, Math.min(WRITE_DELAY, deadline - now));
  };

  return {
    persist,
    flush,
    rewrite(kept) {
      if (kept.layer.hasFailed()) {
        persist(kept, kept.layer.listUnsaved());
      }
    },
    get flushed() {
      return flushed;
    },
    get failure() {
      return failure;
    },
  };
}

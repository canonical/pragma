import { NO_PRESENTATION } from "./constants.js";
import type { JsonValue, PreferenceLayer, ViewPresentation } from "./types.js";

/**
 * Create one target's preference layer: its values, the change that last
 * wrote each key, the keys sent and not yet answered, and the keys whose
 * last write failed. A read is settled into it key by key, so a change not
 * yet sent when the read began, one still in flight, or one whose write
 * failed keeps its value: the read cannot know it. It holds `initial` until
 * the first read or change, and a read replaces what it held.
 *
 * @note Impure by design: the layer holds the values and the bookkeeping
 * of one target's preferences, and every method changes them in place.
 */
export default function createPreferenceLayer(
  initial: ViewPresentation = NO_PRESENTATION,
): PreferenceLayer {
  let values: Record<string, JsonValue> = { ...initial };
  const changed = new Map<string, number>();
  const sent = new Set<string>();
  const failed = new Set<string>();

  return {
    get values() {
      return values;
    },
    change(patch, token) {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete values[key];
        } else {
          values[key] = value;
        }
        changed.set(key, token);
      }
    },
    settle(read, since) {
      const next: Record<string, JsonValue> = { ...read };
      for (const [key, token] of changed) {
        if (token <= since && !sent.has(key) && !failed.has(key)) {
          continue;
        }
        // An own property only: a key naming a prototype member has no
        // value just because the prototype has that member.
        const value = Object.hasOwn(values, key) ? values[key] : undefined;
        if (value === undefined) {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
      values = next;
    },
    readChangeToken(key) {
      return changed.get(key);
    },
    markSent(keys) {
      for (const key of keys) {
        sent.add(key);
      }
    },
    markWritten(keys) {
      for (const key of keys) {
        sent.delete(key);
        failed.delete(key);
      }
    },
    markFailed(keys) {
      for (const key of keys) {
        sent.delete(key);
        failed.add(key);
      }
    },
    listUnsaved() {
      return Object.fromEntries([...failed].map((key) => [key, values[key]]));
    },
    hasFailed() {
      return failed.size > 0;
    },
  };
}

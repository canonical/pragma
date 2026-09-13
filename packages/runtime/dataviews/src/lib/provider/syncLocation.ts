import type { HistoryMode } from "../location/index.js";
import { createChannel, protectChannel } from "../observable/index.js";
import { areListsEqual, areSlicesEqual, type Query } from "../query/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import {
  decodeQuery,
  encodeQuery,
  isOwnedKey,
  type QueryIssue,
} from "../wire/index.js";
import type { LocationSync, LocationSyncConfig, Transition } from "./types.js";

/**
 * Two queries the location cannot tell apart. Every window member the
 * grammar spells is compared; `collapsed` is not, because it has no spelling
 * — collapsing a group must not provoke a write of the same URL.
 */
const isSameQuery = (a: Query, b: Query): boolean =>
  (a.slice === b.slice || areSlicesEqual(a.slice, b.slice)) &&
  a.window.page === b.window.page &&
  a.window.size === b.window.size &&
  a.window.cursor === b.window.cursor;

const areIssuesEqual = (
  a: readonly QueryIssue[],
  b: readonly QueryIssue[],
): boolean =>
  areListsEqual(
    a,
    b,
    (issue, other) =>
      issue.parameter === other.parameter &&
      issue.code === other.code &&
      issue.reason === other.reason,
  );

/**
 * Keep a location and the host's query in step.
 *
 * There is one authoritative query and it lives in the location: the host
 * never mirrors it with an effect of its own. The loop is driven by the
 * transitions the host announces, each carrying its history mode: one with
 * a mode is spelled and, where the location says otherwise, written in that
 * mode, then read back; the location's notification of that very spelling
 * is the loop's own echo and stops. Any other notification is read — its
 * refusals reported with their codes, its query adopted if it differs, its
 * spelling made canonical in place — and an adoption is never written back.
 * On `observe()` the location is read before anything else runs, so the
 * first request a provider issues is the location's query and never the
 * seed followed by a second fetch. Everything that touches the URL goes
 * through the location port: the loop never reads the browser, and how a
 * write enters history is the port's to carry out.
 *
 * One sync owns one host: two syncs on the same host both write every
 * transition.
 *
 * @note Impure by design: observing subscribes to the location and the
 * host, and the loop writes the location; that is what the port is for.
 */
export default function syncLocation<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: LocationSyncConfig<TFields, TRow>): LocationSync {
  const { host, location } = config;
  const { schema } = host.collection;
  const issues = createChannel<readonly QueryIssue[]>([], {
    equals: areIssuesEqual,
  });
  /**
   * The spelling the loop last wrote, whose notification is its own echo.
   * Null once the location has moved on, so a later return to that very
   * spelling — Forward after Back — is read like any other move.
   */
  let lastWritten: string | null = null;
  /**
   * The last transition the loop heard. A reset announced while nothing
   * observed is one the loop never heard, and the next observation writes
   * it over the location; one it heard was written as it was heard — or
   * threw then, and is not retried — and a location moved since, by Back
   * or a bookmark, is the reader's to keep.
   */
  let heard: Transition | null = null;

  /** A query as the location spells it, the location's other parameters kept. */
  const spell = (query: Query, preserve: URLSearchParams): URLSearchParams =>
    encodeQuery({
      schema,
      slice: query.slice,
      window: query.window,
      preserve,
    });

  /**
   * Write a spelling the location does not carry yet. A write that throws
   * without landing is awaited as no echo: the spelling arriving later from
   * outside is a move to adopt.
   */
  const writeLocation = (next: URLSearchParams, history: HistoryMode): void => {
    lastWritten = next.toString();
    try {
      location.write(next, { history });
    } catch (error) {
      if (location.read().toString() !== lastWritten) {
        lastWritten = null;
      }
      throw error;
    }
  };

  /**
   * Read the location: report what it refuses, respell what is clean but
   * not canonical, and adopt what it carries when the host stands
   * elsewhere. The respelling replaces, since it is not a step the reader
   * took, and comes before the adoption, so whatever the adoption provokes
   * finds the location already settled.
   */
  const readLocation = (params: URLSearchParams): void => {
    const decoded = decodeQuery({
      schema,
      params,
      capabilities: host.capabilities,
    });
    issues.set(decoded.issues);
    // What the loop wrote itself is canonical by construction; only a
    // spelling that arrived from elsewhere can need respelling.
    if (decoded.issues.length === 0 && params.toString() !== lastWritten) {
      const canonical = spell(decoded, params);
      if (canonical.toString() !== params.toString()) {
        writeLocation(canonical, "replace");
      }
    }
    if (!isSameQuery(host.state.get(), decoded)) {
      host.adopt({ slice: decoded.slice, window: decoded.window }, "adopt");
    }
  };

  /**
   * Write a transition that enters history, where the location says
   * otherwise, and read the spelling back: what was written is what the
   * location now carries, and a clause the source cannot execute — one a
   * caller adopted past the command boundary — is refused and narrowed
   * exactly as it would be on a reload.
   */
  const onTransition = (): void => {
    const transition = host.transitions.get();
    heard = transition;
    if (transition === null || transition.history === null) {
      return;
    }
    const params = location.read();
    const spelled = spell(transition.query, params);
    if (spelled.toString() !== params.toString()) {
      try {
        writeLocation(spelled, transition.history);
      } catch (error) {
        if (lastWritten !== null) {
          // Written, but a listener threw — perhaps before the loop's own
          // heard it. Read it back all the same, so a refusal is not lost.
          readLocation(spelled);
        }
        throw error;
      }
    }
    readLocation(spelled);
  };

  return {
    issues: protectChannel(issues),
    observe(): () => void {
      let live = true;
      // The location may have moved while nothing was observing it, so
      // nothing written before is awaited as an echo.
      lastWritten = null;
      const params = location.read();
      const carriesQuery = [...new Set(params.keys())].some((key) =>
        isOwnedKey(key, schema),
      );
      const last = host.transitions.get();
      const unheardReset = last?.cause === "reset" && last !== heard;
      heard = last;
      if (carriesQuery && !unheardReset) {
        readLocation(params);
      } else {
        // A location carrying no query takes the host's — its seed, or the
        // state a reset nothing observed returned it to — and is then read
        // back, so a seed clause the source cannot execute is refused and
        // reported the way any other location clause is.
        const spelled = spell(host.state.get(), params);
        if (spelled.toString() !== params.toString()) {
          writeLocation(spelled, "replace");
        }
        readLocation(location.read());
      }
      // Subscribed after the first pass, so a location that notifies on
      // subscribe cannot adopt itself over the seed before the pass has
      // read it. Each subscription is its own closure, never a shared
      // function: listeners are held in a set, so two observations
      // subscribing one reference would register once and the first
      // release would deafen the second.
      const stopLocation = location.subscribe(() => {
        const current = location.read();
        if (current.toString() === lastWritten) {
          return;
        }
        lastWritten = null;
        readLocation(current);
      });
      const stopTransitions = host.transitions.subscribe(() => {
        onTransition();
      });
      return function release(): void {
        if (!live) {
          return;
        }
        live = false;
        stopLocation();
        stopTransitions();
      };
    },
  };
}

import type { CollectionState } from "../collection/createCollectionCoordinator.js";
import type { ReadonlyChannel } from "../observable/createChannel.js";
import createChannel from "../observable/createChannel.js";
import sliceEquals from "../query/sliceEquals.js";
import type { Query } from "../query/types.js";
import type { Schema } from "../schema/createSchema.js";
import type { SchemaFieldDefinition } from "../schema/types.js";
import type { SourceCapabilities } from "../source/types.js";
import decodeQuery from "../wire/decodeQuery.js";
import encodeQuery from "../wire/encodeQuery.js";
import type { QueryIssue } from "../wire/types.js";
import { isOwnedKey } from "../wire/wireGrammar.js";
import type { Location } from "./types.js";

/**
 * The structural host surface the location binding drives. The handle
 * `createDataViewsProvider` returns satisfies it, and so can a narrower
 * host.
 */
export type LocationHost = {
  /** The schema whose field addresses the query occupies. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /**
   * The coordinator snapshot channel: query, window and disposal. Read-only
   * and widest in its record type, so a provider built for any row type is
   * a host without a cast — the binding never publishes on it.
   */
  readonly state: ReadonlyChannel<CollectionState<object>>;
  /**
   * What the host's source declares it can execute, or null when the host
   * was not told. A location clause outside it is refused, not adopted.
   */
  readonly capabilities: SourceCapabilities | null;
  /** Adopt externally authoritative query and window together. */
  readonly adopt: (query: Query) => void;
};

/** Configuration of one location binding. */
export type LocationBindingConfig = {
  readonly host: LocationHost;
  readonly location: Location;
  /**
   * How a host transition enters history. Defaults to `"replace"`, so a
   * stream of edits does not bury the entry the user arrived on. Seeding
   * and canonicalizing an adopted location always replace: neither is a
   * step the user took.
   */
  readonly history?: "push" | "replace";
};

/** Handle of one location binding. */
export type LocationBinding = {
  /**
   * The owned parameters the location currently carries that were
   * refused. Empty while the query is clean; a host renders it as the
   * visible query error beside its controls.
   */
  readonly issues: ReadonlyChannel<readonly QueryIssue[]>;
  /**
   * Start the loop and return its release.
   *
   * On start the location wins when it carries a query, and takes the
   * host's seed when it carries none. After that, every accepted host
   * transition writes the canonical query and every external location
   * change — back, forward, a pasted URL — is adopted.
   *
   * Constructing the binding subscribes to nothing: a React host builds it
   * in a memo and observes from an effect, and a discarded render must
   * leave no live subscription behind.
   */
  readonly observe: () => () => void;
};

/** One read-back of the location: where the host began it, and what it owes. */
type ReadBack = {
  readonly from: Query;
  /** The history mode of a write owed once it is done, or null. */
  owed: "push" | "replace" | null;
};

const queryOf = (source: Query): Query => ({
  slice: source.slice,
  window: source.window,
});

/**
 * Two queries the location cannot tell apart. Every window member the
 * grammar spells is compared; `collapsed` is not, because it has no spelling
 * — collapsing a group must not provoke a write of the same URL.
 */
const sameQuery = (a: Query, b: Query): boolean =>
  (a.slice === b.slice || sliceEquals(a.slice, b.slice)) &&
  a.window.page === b.window.page &&
  a.window.size === b.window.size &&
  a.window.cursor === b.window.cursor;

const issuesEqual = (
  a: readonly QueryIssue[],
  b: readonly QueryIssue[],
): boolean =>
  a.length === b.length &&
  a.every(
    (issue, index) =>
      issue.parameter === b[index].parameter &&
      issue.reason === b[index].reason,
  );

/**
 * Bind a Location to a host's query authority.
 *
 * There is one authoritative query and it lives in the location: the host
 * never mirrors it with an effect of its own. A write the binding makes
 * decodes back to the state that produced it, so an echo adopts nothing and
 * the loop terminates on the first pass in both directions.
 *
 * One binding owns one host: two bindings on the same host both write every
 * transition.
 */
export default function createLocationBinding(
  config: LocationBindingConfig,
): LocationBinding {
  const { host, location } = config;
  const history = config.history ?? "replace";
  const issues = createChannel<readonly QueryIssue[]>([], {
    equals: issuesEqual,
  });
  /**
   * The query the location stands at, or null when it is owed a write.
   * The host sitting there writes nothing: rows arriving, a refresh and an
   * error all publish the same query, and a refused location keeps its
   * parameters — so the error survives a reload instead of quietly
   * becoming the broader query that was not asked for.
   */
  let standing: Query | null = null;
  /**
   * The parameters the binding last wrote or found already written. Their
   * echo is read back but never re-canonicalized — which is also what ends
   * the read-back of a write that had nothing to write.
   */
  let written: string | null = null;

  /** The read-back in progress, or null. */
  let reading: ReadBack | null = null;

  /**
   * Write the host's query. `then` says what follows a write with
   * nothing to write: `"read-back"` reads the location back as its echo
   * would; `"skip"` does not, because the caller has just decoded the
   * location.
   */
  function writeToLocation(
    mode: "push" | "replace",
    then: "read-back" | "skip",
  ): void {
    if (reading !== null) {
      // A publication the read-back provokes — landing where the location
      // stands or where the read-back began — writes nothing: the read-back
      // has the last word, and a host that publishes on adopt without
      // moving would otherwise bring it straight back here. Anything else
      // is owed one write once it is done, in the mode of the last reason
      // for it: a canonicalization replaces, a later genuine move pushes.
      // Termination holds per synchronous
      // dispatch; a listener that re-applies a refused clause lands where
      // the read-back began and is taken as its own.
      const moved = host.state.get();
      const provoked =
        standing !== null &&
        (sameQuery(standing, moved) || sameQuery(reading.from, moved));
      if (!provoked) {
        reading.owed = mode;
      }
      return;
    }
    const state = host.state.get();
    if (standing !== null && sameQuery(standing, state)) {
      return;
    }
    const preserve = location.read();
    const next = encodeQuery({
      schema: host.schema,
      slice: state.slice,
      window: state.window,
      preserve,
    });
    const spelled = next.toString();
    // Recorded before the write: a location notifying synchronously
    // re-enters adoptFromLocation from inside it, and what that adoption
    // records — a refusal included — must have the last word.
    const at = queryOf(state);
    standing = at;
    issues.set([]);
    written = spelled;
    if (spelled === preserve.toString()) {
      // Nothing to write, so nothing echoes: read the location back as the
      // echo would, so a clause the source cannot execute is still refused.
      if (then === "read-back") {
        const current: ReadBack = { from: at, owed: null };
        reading = current;
        try {
          adoptFromLocation(preserve);
        } finally {
          reading = null;
        }
        if (current.owed !== null) {
          // Owed, so written wherever the location stands.
          standing = null;
          writeToLocation(current.owed, "read-back");
        }
      }
      return;
    }
    try {
      location.write(next, { history: mode });
    } catch (error) {
      if (location.read().toString() === spelled) {
        // Written, but a listener threw — perhaps before this binding's own
        // listener heard it. Read it back so its refusal is not lost; an
        // error from that read-back replaces the listener's.
        adoptFromLocation();
      } else {
        // Unwritten, so the next publication tries again.
        standing = null;
      }
      throw error;
    }
  }

  function adoptFromLocation(params = location.read()): void {
    const decoded = decodeQuery({
      schema: host.schema,
      params,
      capabilities: host.capabilities,
    });
    issues.set(decoded.issues);
    // Recorded before adopting: the adoption publishes, and that
    // publication re-enters writeToLocation, which must find the location
    // already standing here.
    standing = queryOf(decoded);
    if (sameQuery(host.state.get(), decoded)) {
      // The echo of the binding's own write, or a change that reads the
      // same: adopting would discard live input sessions for nothing. The
      // host's own slice is kept, so later comparisons short-circuit on
      // reference.
      standing = queryOf(host.state.get());
    } else {
      host.adopt({ slice: decoded.slice, window: decoded.window });
    }
    if (decoded.issues.length === 0 && params.toString() !== written) {
      // A clean location is canonicalized in place — unless it is the
      // binding's own write coming back. A respelling is not a step the
      // user took, so it replaces rather than pushes, and it was decoded
      // just now, so the write reads nothing back.
      if (reading !== null) {
        // Inside a read-back the canonicalization is owed, not written: the
        // read-back writes it once done, and a publication landing here
        // meanwhile is its own.
        reading.owed = "replace";
        return;
      }
      standing = null;
      writeToLocation("replace", "skip");
    }
  }

  return {
    issues,
    observe(): () => void {
      let live = true;
      const onHostChange = (): void => {
        if (host.state.get().disposed) {
          release();
          return;
        }
        writeToLocation(history, "read-back");
      };
      // Its own closure, never the shared function: a Location holds its
      // listeners in a set, so two observations subscribing one reference
      // register once and the first release deafens the second.
      const stopLocation = location.subscribe(() => {
        adoptFromLocation();
      });
      const stopHost = host.state.subscribe(onHostChange);
      function release(): void {
        if (!live) {
          return;
        }
        live = false;
        stopLocation();
        stopHost();
      }

      if (host.state.get().disposed) {
        release();
        return release;
      }
      // The location may have moved while nothing was observing it, so a
      // fresh observation owes it a write.
      standing = null;
      written = null;
      const carriesQuery = [...location.read().keys()].some((key) =>
        isOwnedKey(key, host.schema.hasField),
      );
      if (carriesQuery) {
        adoptFromLocation();
      } else {
        // A location carrying no query takes the host's seed rather than
        // erasing it.
        writeToLocation("replace", "read-back");
      }
      return release;
    },
  };
}

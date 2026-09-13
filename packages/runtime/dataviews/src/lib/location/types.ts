/**
 * The location port and the loop that binds it to a host: what a location
 * reads and writes, the host the binding drives, and the issues it
 * publishes for clauses the location carried that nothing could run.
 */

import type { CollectionState } from "../collection/index.js";
import type { ReadonlyChannel } from "../observable/index.js";
import type { Query } from "../query/index.js";
import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import type { SourceCapabilities } from "../source/index.js";
import type { QueryIssue } from "../wire/index.js";
/**
 * The Location port: the live query authority for a collection. Reads and
 * writes preserve repeated parameters (`status=failed&status=cancelled`);
 * there is no scalar flattening anywhere in the port.
 */

/**
 * Configuration of one Location.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type LocationConfig = {
  /** The initial href; defaults to the local base with no query. */
  readonly href?: string | undefined;
};

/**
 * Handle of one Location.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type Location = {
  /**
   * The current query parameters as a fresh URLSearchParams — callers may
   * mutate the returned object; the Location's own state never aliases it.
   */
  readonly read: () => URLSearchParams;
  /**
   * Write the full query parameter set. On history-backed locations,
   * `history: "push"` appends an entry and the default replaces, so
   * continuous input does not flood history; the memory location has no
   * history stack and ignores the option.
   */
  readonly write: (
    next: URLSearchParams,
    options?: { readonly history?: "push" | "replace" },
  ) => void;
  /**
   * Subscribe to every change; the return value unsubscribes. A throwing
   * listener aborts the publication and the exception propagates to the
   * writer.
   */
  readonly subscribe: (listener: () => void) => () => void;
};

/**
 * The structural host surface the location binding drives. The handle
 * `createDataViewsProvider` returns satisfies it, and so can a narrower
 * host.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
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

/**
 * Configuration of one location binding.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type LocationBindingConfig = {
  readonly host: LocationHost;
  readonly location: Location;
  /**
   * How a host transition enters history. Defaults to `"replace"`, so a
   * stream of edits does not bury the entry the user arrived on. Seeding
   * and canonicalizing an adopted location always replace: neither is a
   * step the user took. A transition that changes the ordering always
   * pushes, whatever this says.
   */
  readonly history?: "push" | "replace" | undefined;
};

/**
 * Handle of one location binding.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
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

/**
 * The minimal platform surface a Location adapter composes — satisfied
 * structurally by @canonical/router-core's `PlatformAdapter` without a
 * dependency edge. Only the read, write and subscribe members: platform navigation
 * state payloads are not part of the port.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type PlatformLocation = {
  readonly getLocation: () => string | URL;
  readonly navigate: (
    url: string,
    options?: { readonly replace?: boolean },
  ) => void;
  readonly subscribe: (
    listener: (location: string | URL) => void,
  ) => () => void;
};

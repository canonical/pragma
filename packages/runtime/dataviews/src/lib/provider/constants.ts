/**
 * The provider domain's constants: the registry pairing each provider with
 * its host, and the tables the query path reads a transition's history
 * from — which cause each command announces, how each transition enters
 * history by default, and how the causes no policy names do.
 */

import type { HistoryMode } from "../location/index.js";
import type { QueryCommand } from "../query/index.js";
import type { QueryTransition, TransitionCause } from "./types.js";

/**
 * The registry pairing each provider with its internal host. Held weakly,
 * so a provider nothing else holds is collected with its host; keyed by
 * the provider object, so a structural copy finds nothing; held untyped,
 * since one map serves every field list and record type — a host is read
 * back at the type of the provider it was registered with.
 */
export const PROVIDER_HOSTS = new WeakMap<object, unknown>();

/** The cause each command announces, keyed by the command's kind. */
export const CAUSE_OF_COMMAND: Readonly<
  Record<QueryCommand["kind"], TransitionCause>
> = Object.freeze({
  setPredicate: "filter",
  removePredicate: "filter",
  setSearch: "search",
  setSort: "sort",
  setGroup: "group",
  setCollapsed: "collapse",
  navigateWindow: "window",
});

/**
 * How each transition enters history unless the policy says otherwise:
 * search replaces, so typing never floods history; every other transition
 * is a step Back returns from.
 */
export const DEFAULT_HISTORY: Readonly<Record<QueryTransition, HistoryMode>> =
  Object.freeze({
    filter: "push",
    search: "replace",
    sort: "push",
    group: "push",
    window: "push",
    view: "push",
  });

/**
 * How the causes no policy names enter history: a collapse has no spelling
 * and the location's own adoption is never written back, so neither enters
 * it; a reset returns to the declared state rather than taking a step, so
 * it replaces.
 */
export const FIXED_HISTORY: Readonly<
  Record<Exclude<TransitionCause, QueryTransition>, HistoryMode | null>
> = Object.freeze({
  collapse: null,
  adopt: null,
  reset: "replace",
});

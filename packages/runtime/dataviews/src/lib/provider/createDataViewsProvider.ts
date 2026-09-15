import {
  createQueryCoordinator,
  type DataViewsState,
} from "../coordinator/index.js";
import type { QueryLocation } from "../location/index.js";
import {
  createChannel,
  protectChannel,
  type ReadonlyChannel,
} from "../observable/index.js";
import { createPresentation } from "../presentation/index.js";
import type {
  GroupPath,
  GroupTerm,
  Predicate,
  PredicateOperator,
  Query,
  SetOperator,
  SortTerm,
  WindowNavigation,
} from "../query/index.js";
import {
  type Applicability,
  EMPTY_ROW_MODEL,
  type RowModel,
  type RowRecord,
} from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import { createSelection } from "../selection/index.js";
import { createSnapshot, type DataViewsSnapshot } from "../snapshot/index.js";
import { copyCapabilities } from "../source/index.js";
import { createSavedViews } from "../views/index.js";
import type { QueryIssue } from "../wire/index.js";
import createActionRunner from "./createActionRunner.js";
import createQueryCommands from "./createQueryCommands.js";
import createRecordTyping from "./createRecordTyping.js";
import createRequestCompleter from "./createRequestCompleter.js";
import observePorts from "./observePorts.js";
import readStartingPoint from "./readStartingPoint.js";
import registerProviderHost from "./registerProviderHost.js";
import resolveHistoryPolicy from "./resolveHistoryPolicy.js";
import runSource from "./runSource.js";
import spellLocation from "./spellLocation.js";
import syncLocation from "./syncLocation.js";
import type {
  DataViewsProvider,
  DataViewsProviderConfig,
  PortRun,
  ProviderHost,
  Transition,
} from "./types.js";

/**
 * The read side of a location, called through rather than unbound: an
 * adapter may reach its own state through `this`. Null without a location.
 */
const readSideOf = (
  location: QueryLocation | undefined,
): ProviderHost["location"] =>
  location === undefined
    ? null
    : {
        read: () => location.read(),
        subscribe: (listener) => location.subscribe(listener),
      };

/** The issues a provider with no location and nothing refused publishes: none, ever. */
const NO_ISSUES: ReadonlyChannel<readonly QueryIssue[]> = protectChannel(
  createChannel<readonly QueryIssue[]>(Object.freeze([])),
);

/**
 * Create the DataViews provider: the one owner of a collection's state and
 * of the ports that feed it. It assembles the query coordinator, the
 * selection, the row model and the record typing over the collection it is
 * given, reads the source's capabilities once, and drives the source, the
 * location, the presentation and the saved views itself — an application
 * hands it the ports and mounts.
 *
 * Construction reads the location once — the query it carries, decoded as the
 * location loop decodes it, is where the provider stands and what it refused is
 * on `issues` — and starts nothing: no subscription and no request, so a server
 * render carries the URL's query and stays quiet. `observe()` is ref-counted:
 * the first observer adopts the location, starts source execution, the location
 * loop, the presentation and the views, and asks for a page when nothing is
 * pending after that — the first page from idle, the current one again after a
 * problem, while ready rows nothing ran are taken up; the last release stops
 * all of it, and the next observer starts it again.
 *
 * @note Impure by design: the provider is the one place the collection's
 * state lives, and observing it starts its ports — subscriptions on the
 * location, the store and the source's client.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createDataViewsProvider<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(
  config: DataViewsProviderConfig<TFields, TRow>,
): DataViewsProvider<TFields, TRow> {
  const { collection, source } = config;
  // Copied once, so the declaration cannot change under the provider: what
  // a control reads is what the run checks requests against.
  const capabilities = copyCapabilities(source.capabilities);
  // Asked for once and for every request, so a facet the source does not
  // compute is refused here, before anything executes.
  const facets = Object.freeze([...new Set<string>(config.facets ?? [])]);
  for (const field of facets) {
    if (!capabilities.facets.includes(field)) {
      throw new Error(`this source declares no facet for "${field}"`);
    }
  }
  // A choice whose options are the server's is offered only from its facet:
  // one the source filters but nobody asks the facet of would offer nothing,
  // and say nothing about why.
  for (const definition of collection.schema.fields) {
    if (
      definition.kind === "choices" &&
      definition.options === undefined &&
      Object.hasOwn(capabilities.filter, definition.field) &&
      !facets.includes(definition.field)
    ) {
      throw new Error(
        `the options of "${definition.field}" are the server's, so the provider must ask for its facet`,
      );
    }
  }
  // Where the provider starts: the snapshot and the location read once, with
  // nothing subscribed and nothing requested, so a server render carries the
  // URL's query.
  const keepsViews = config.views !== undefined;
  const starting = readStartingPoint({
    collection,
    capabilities,
    location: config.location,
    snapshot: config.snapshot,
    keepsViews,
  });
  // What the query the provider stands on was refused for: the channel a
  // provider without a location reports, the location sync's otherwise.
  const snapshotIssues: ReadonlyChannel<readonly QueryIssue[]> =
    starting.issues.length === 0
      ? NO_ISSUES
      : protectChannel(
          createChannel<readonly QueryIssue[]>(
            Object.freeze([...starting.issues]),
          ),
        );
  const coordinator = createQueryCoordinator<TRow>({
    start: starting.start,
    initial: starting.initial,
  });
  const openView = createChannel<string | null>(starting.view);
  const selection = createSelection();
  const state = createChannel<DataViewsState<TRow>>(coordinator.state, {
    equals: (a, b) => a === b,
  });
  const rows = createChannel<RowModel<TRow>>(EMPTY_ROW_MODEL);
  /** The read side of the rows, handed to everything but the completer. */
  const rowsView = protectChannel(rows);
  const recordTyping =
    collection.types === null
      ? null
      : createRecordTyping<TFields, TRow>({
          collection,
          selection,
          rows: rowsView,
        });

  const publishState = (): void => {
    state.set(coordinator.state);
  };

  const transitions = createChannel<Transition | null>(null);
  const history = resolveHistoryPolicy(config.history);
  const {
    refusals,
    command,
    adopt,
    refresh: issueRefresh,
  } = createQueryCommands({
    coordinator,
    capabilities,
    source,
    publish: publishState,
    transitions,
    history,
    view: openView,
  });

  const complete = createRequestCompleter({
    coordinator,
    rows,
    identify: collection.identify,
    recordTyping,
    publish: publishState,
  });

  const host: ProviderHost<TFields, TRow> = {
    collection,
    capabilities,
    state: protectChannel(state),
    refusals,
    setPredicate: (predicate: Predicate, replaces?: SetOperator) =>
      command({ kind: "setPredicate", predicate, replaces }),
    removePredicate: (field: string, operator: PredicateOperator) =>
      command({ kind: "removePredicate", field, operator }),
    refresh: issueRefresh,
    adopt,
    view: protectChannel(openView),
    transitions: protectChannel(transitions),
    location: readSideOf(config.location),
    spellQuery(query: Query): URLSearchParams | null {
      return config.location === undefined
        ? null
        : spellLocation({
            schema: collection.schema,
            query,
            view: openView.get(),
            preserve: config.location.read(),
          });
    },
    complete,
    applicability(field: string, row: TRow): Applicability {
      return recordTyping?.applicability(field, row) ?? "applies";
    },
    recordType(id: string): string | null {
      return recordTyping?.recordType(id) ?? null;
    },
  };

  const presentation = createPresentation({
    store: config.presentation,
    // The snapshot's arrangement, with the view it was drawn under, or none.
    restored: starting.restored,
    // The arrangement a followed link carries, with the view it named.
    linked: starting.linked,
  });
  const views =
    config.views === undefined
      ? null
      : createSavedViews({
          host: {
            schema: collection.schema,
            capabilities,
            state: host.state,
            view: host.view,
            transitions: host.transitions,
            // A view's query is the view's authority, moved with its name.
            adopt,
          },
          store: config.views,
          presentation,
        });
  const location =
    config.location === undefined
      ? null
      : syncLocation({
          host,
          location: config.location,
          keepsViews,
          issues: starting.issues,
        });
  const run = runSource({ host, source, facets });

  const runAction = createActionRunner({ source, capabilities, selection });

  /**
   * The ports, the location first: adopting it issues the request the source
   * then executes, so the first page answers the location's query and never the
   * snapshot's. Ready rows nothing ran — drawn by `refresh()` before hydrating,
   * or left by a released observation — are taken up by the source run under
   * the request they answer, so the source is live again with no request and no
   * `refreshing` flash. Any other provider with no request in flight after the
   * ports start is asked for its page: the first page when it is idle, or the
   * current one again after a problem. An adoption that issued a request, or
   * one the source refused at once, has already answered for the observation
   * and is not asked again.
   */
  const ports: PortRun[] = [];
  if (location !== null) {
    ports.push(location);
  }
  ports.push(run, presentation);
  if (views !== null) {
    ports.push(views);
  }
  let before = coordinator.state;
  const observation = observePorts({
    ports,
    afterStart() {
      const { pendingRequestId, result } = coordinator.state;
      if (
        pendingRequestId === null &&
        coordinator.state === before &&
        // Ready rows are the source run's to take up, not to ask for again.
        result.status !== "ready"
      ) {
        issueRefresh();
      }
    },
  });

  const provider: DataViewsProvider<TFields, TRow> = {
    collection,
    capabilities,
    state: host.state,
    rows: rowsView,
    issues: location?.issues ?? snapshotIssues,
    selection,
    views,
    presentation,
    readSnapshot(): DataViewsSnapshot {
      const { slice, window } = coordinator.state;
      return createSnapshot({
        // What the URL carries, spelled as the location spells it.
        query: spellLocation({
          schema: collection.schema,
          query: { slice, window },
          view: openView.get(),
          preserve: new URLSearchParams(),
        }),
        presentation: presentation.state.get().presentation,
      });
    },
    navigateWindow: (window: WindowNavigation) =>
      command({ kind: "navigateWindow", ...window }),
    setSort: (sort: readonly SortTerm[]) => command({ kind: "setSort", sort }),
    setSearch: (search: string) => command({ kind: "setSearch", search }),
    setGroup: (group: readonly GroupTerm[]) =>
      command({ kind: "setGroup", group }),
    setCollapsed: (collapsed: readonly GroupPath[]) =>
      command({ kind: "setCollapsed", collapsed }),
    refresh(): void {
      issueRefresh();
      // Unobserved, the source is read here: one that answers from what it
      // holds has published before this returns.
      run.completePending();
    },
    refusals,
    runAction,
    observe(): () => void {
      // What the state was before the ports started, for `afterStart`.
      before = coordinator.state;
      return observation.observe();
    },
    reset(): void {
      coordinator.reset();
      rows.set(EMPTY_ROW_MODEL);
      selection.clear();
      recordTyping?.forget();
      views?.forget();
      openView.set(null);
      publishState();
      // Announced whether or not anything observes: the next observation
      // reads that the last move was a reset, and writes where the provider
      // started over a location still carrying the query from before.
      const { slice, window } = coordinator.state;
      transitions.set({
        query: { slice, window },
        cause: "reset",
        history: history.reset,
      });
      // An observed provider is asked for the new generation's first page
      // as it was for the first one; an unobserved one waits for its
      // first observer, which asks then.
      if (observation.observers > 0) {
        issueRefresh();
      }
    },
  };
  registerProviderHost(provider, host);
  return provider;
}

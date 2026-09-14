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
import { copyCapabilities } from "../source/index.js";
import { createSavedViews } from "../views/index.js";
import { encodeQuery, type QueryIssue } from "../wire/index.js";
import createActionRunner from "./createActionRunner.js";
import createQueryCommands from "./createQueryCommands.js";
import createRecordTyping from "./createRecordTyping.js";
import createRequestCompleter from "./createRequestCompleter.js";
import observePorts from "./observePorts.js";
import registerProviderHost from "./registerProviderHost.js";
import resolveHistoryPolicy from "./resolveHistoryPolicy.js";
import runSource from "./runSource.js";
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

/** The issues a provider without a location publishes: none, ever. */
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
 * Construction starts nothing. `observe()` is ref-counted: the first
 * observer adopts the location, starts source execution, the location loop,
 * the presentation and the views, and asks for a page when nothing is
 * pending after that — the first page from idle, the current one again
 * after a release; the last release stops all of it, and the next observer
 * starts it again.
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
  const coordinator = createQueryCoordinator<TRow>({
    slice: config.seed?.slice,
    window: config.seed?.window,
  });
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
    setPredicate: (predicate: Predicate) =>
      command({ kind: "setPredicate", predicate }),
    removePredicate: (field: string, operator: PredicateOperator) =>
      command({ kind: "removePredicate", field, operator }),
    refresh: issueRefresh,
    adopt,
    transitions: protectChannel(transitions),
    location: readSideOf(config.location),
    spellQuery(query: Query): URLSearchParams | null {
      return config.location === undefined
        ? null
        : encodeQuery({
            schema: collection.schema,
            slice: query.slice,
            window: query.window,
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

  const presentation = createPresentation({ store: config.presentation });
  const views =
    config.views === undefined
      ? null
      : createSavedViews({
          host: {
            schema: collection.schema,
            capabilities,
            state: host.state,
            // A view's query is the view's authority, and opening one is a
            // step Back returns from.
            adopt(query: Query): void {
              adopt(query, "view");
            },
          },
          store: config.views,
          presentation,
        });
  const location =
    config.location === undefined
      ? null
      : syncLocation({ host, location: config.location });
  const run = runSource({ host, source });

  const runAction = createActionRunner({ source, capabilities, selection });

  /**
   * The ports, the location first: adopting it issues the request the
   * source then executes, so the first page answers the location's query
   * and never the seed's. A provider with no request in flight after they
   * start is asked for its page — the first page when it is idle, and the
   * current one again when an earlier observation settled it and then
   * released the source, so the source is live again and a later change to
   * the same query still reaches the rows. An adoption that issued a
   * request, or one the source refused at once, has already answered for
   * the observation and is not asked again.
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
      if (
        coordinator.state.pendingRequestId === null &&
        coordinator.state === before
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
    issues: location?.issues ?? NO_ISSUES,
    selection,
    views,
    presentation,
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
      publishState();
      // Announced whether or not anything observes: the next observation
      // reads that the last move was a reset, and writes the seed over a
      // location still carrying the query from before.
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

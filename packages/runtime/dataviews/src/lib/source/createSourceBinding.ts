import type { CollectionState } from "../collection/index.js";
import type { ReadonlyChannel } from "../observable/index.js";
import type { ActionInvocation, Operation } from "../operation/index.js";
import type { PredicateOperator, Query } from "../query/index.js";
import type {
  Completion,
  Count,
  SourceCounts,
  SourceDelivery,
  SourceRefusal,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { Selection } from "../selection/index.js";
import copyCapabilities from "./copyCapabilities.js";
import pluralize from "./pluralize.js";
import reasonOf from "./reasonOf.js";
import supportsRequest from "./supportsRequest.js";
import type {
  CountSupport,
  Source,
  SourceActionRequest,
  SourceCapabilities,
} from "./types.js";

/**
 * The structural host surface the binding drives. The handle
 * `createDataViewsProvider` returns satisfies it, and so can a narrower
 * host.
 */
export type SourceHost<TRow extends object = RowRecord> = {
  /**
   * What the host's source declares it can execute, or null when the host
   * was not told. Non-null, it must be the source's own declaration.
   */
  readonly capabilities: SourceCapabilities | null;
  /** The coordinator snapshot channel: query, window and pending request. */
  readonly state: ReadonlyChannel<CollectionState<TRow>>;
  readonly selection: Selection;
  readonly refresh: () => string | null;
  readonly complete: (
    requestId: string,
    completion: Completion<TRow>,
  ) => boolean;
  readonly invokeAction: (invocation: ActionInvocation) => Operation;
};

/** Configuration of one source binding. */
export type SourceBindingConfig<TRow extends object = RowRecord> = {
  readonly host: SourceHost<TRow>;
  readonly source: Source<TRow>;
};

/** Handle of one source binding. */
export type SourceBinding = {
  /**
   * What the bound source declares it can execute. Connected parts read the
   * host's copy instead; this is for code holding the binding.
   */
  readonly capabilities: SourceCapabilities;
  /**
   * Every refusal a request in hand would collect, from the declaration and
   * from the source's own check. Empty means executable.
   */
  readonly supports: (query: Query) => readonly SourceRefusal[];
  /**
   * Run one row operation. Resolves with the operation record once every
   * captured target has an outcome — a target the source reports nothing
   * for fails rather than staying pending. Successful targets leave the
   * selection; failures stay for review and retry. Rejects when the action
   * is not declared, or addresses more or other than the declaration allows.
   */
  readonly runAction: (request: SourceActionRequest) => Promise<Operation>;
  /**
   * Start executing the host's requests. The release stops the live
   * request and detaches from the host; it never touches the source's own
   * client or cache.
   */
  readonly observe: () => () => void;
};

/** A list as a set: deduplicated, then sorted. */
const sortedUnique = (list: readonly string[]): string[] =>
  [...new Set(list)].sort();

/**
 * One declaration as a comparable string. Every list in it is a set, so
 * order never matters, and a field declared with no operators is a field
 * not declared.
 */
const filterOf = (filter: SourceCapabilities["filter"]): string[] =>
  sortedUnique(
    // Always a copy, so every field carries its list: `copyCapabilities`
    // writes an empty one where a declaration named none.
    Object.entries(
      filter as Readonly<Record<string, readonly PredicateOperator[]>>,
    ).flatMap(([field, operators]) =>
      operators.map((operator) => JSON.stringify([field, operator])),
    ),
  );

const sortOf = (sort: SourceCapabilities["sort"]): unknown[] => [
  sortedUnique(sort.fields),
  sort.terms,
  sort.default,
  sort.tiebreak,
  sort.collation,
];

const actionsOf = (actions: SourceCapabilities["actions"]): string[] =>
  Object.entries(actions)
    .map(([name, action]) => JSON.stringify([name, action]))
    .sort();

const declarationOf = (capabilities: SourceCapabilities): string =>
  JSON.stringify([
    filterOf(capabilities.filter),
    capabilities.search === null
      ? null
      : sortedUnique(capabilities.search.fields),
    sortOf(capabilities.sort),
    [
      sortedUnique(capabilities.group.fields),
      capabilities.group.depth,
      capabilities.group.summaries,
      capabilities.group.collapse,
    ],
    capabilities.counts,
    capabilities.pagination,
    capabilities.selection,
    actionsOf(capabilities.actions),
  ]);

/**
 * Why a declaration is not one the source can keep, or null when every
 * declared capability has the port that serves it. Checked once, at
 * construction, so a declaration is never a promise discovered to be empty
 * at the moment a control depends on it.
 */
const portRejection = <TRow extends object>(
  capabilities: SourceCapabilities,
  source: Source<TRow>,
): string | null => {
  const declaresActions = Object.keys(capabilities.actions).length > 0;
  if (declaresActions !== (source.runAction !== undefined)) {
    return declaresActions
      ? "this source declares row operations it has no port for"
      : "this source offers a row-operation port it declares no operation for";
  }
  if (
    capabilities.pagination.mode === "cursor" &&
    source.refuses === undefined
  ) {
    // Only the source knows which pages its tokens reach, so a cursor
    // source that refuses nothing would be asked for pages it cannot serve.
    return "a cursor source must declare which pages it cannot reach through refuses";
  }
  return null;
};

/** One count held to what the declaration allows. */
const heldCount = (count: Count, support: CountSupport): Count => {
  if (support === "none" || count.kind === "unknown") {
    return { kind: "unknown" };
  }
  if (!Number.isSafeInteger(count.value) || count.value < 0) {
    // A count that is not a whole number of rows counts nothing: read as a
    // page total it would be NaN, a fraction or a negative.
    return { kind: "unknown" };
  }
  if (support === "atLeast" && count.kind === "exact") {
    return { kind: "atLeast", value: count.value };
  }
  return count;
};

/** Counts held to what the declaration allows, so no source over-claims. */
const heldCounts = (
  counts: SourceCounts,
  declared: SourceCapabilities["counts"],
): SourceCounts => ({
  visible: heldCount(counts.visible, declared.visible),
  matched: heldCount(counts.matched, declared.matched),
  total: heldCount(counts.total, declared.total),
});

/** One live execution: the request it runs and how to release it. Its own
 * object identity distinguishes it from every superseding execution. */
type Execution = {
  release: (() => void) | null;
  requestId: string;
};

/**
 * Bind a source to a host's request lifecycle. The host issues request
 * identities; the binding executes exactly the newest one, drops
 * completions from released or superseded executions, refuses a request the
 * source has not declared support for before it costs a round trip, and
 * republishes a later delivery of the same query under a fresh identity so
 * retained rows never carry another request's provenance. Cache and retry
 * stay the source's.
 *
 * Construction subscribes to nothing: `observe()` starts, and the release it
 * returns stops. One binding owns one host: two bindings on the same host
 * both execute every request and race to complete it.
 */
export default function createSourceBinding<TRow extends object = RowRecord>(
  config: SourceBindingConfig<TRow>,
): SourceBinding {
  const { host, source } = config;
  // Copied once, so the declaration cannot change under the binding and so
  // that both sides of the comparison below are spelled the same way: a
  // host's copy is rebuilt member by member, and a raw declaration written
  // in another key order is the same offer.
  const capabilities = copyCapabilities(source.capabilities);
  // The host offers controls from its own copy; one that says something
  // else would offer what this source refuses.
  if (
    host.capabilities !== null &&
    declarationOf(copyCapabilities(host.capabilities)) !==
      declarationOf(capabilities)
  ) {
    throw new Error(
      "the host was told different capabilities from those its source declares",
    );
  }
  const rejection = portRejection(capabilities, source);
  if (rejection !== null) {
    throw new Error(rejection);
  }

  let execution: Execution | null = null;
  let scope = host.state.get().scope;
  let unsubscribe: (() => void) | null = null;
  /** True while the binding itself is issuing a request on the host. */
  let driving = false;

  const stop = (): void => {
    if (execution === null) {
      return;
    }
    const { release } = execution;
    execution = null;
    if (release !== null) {
      release();
    }
  };

  const detach = (): void => {
    if (unsubscribe === null) {
      return;
    }
    unsubscribe();
    unsubscribe = null;
    stop();
  };

  /** Every refusal one request collects, declaration first then the source's. */
  const refusalsFor = (query: Query): readonly SourceRefusal[] => {
    const declared = supportsRequest(capabilities, query);
    if (declared.length > 0) {
      // The source's own check reads state that a refused request never
      // reaches; asking it about one would be asking a question it has no
      // answer for.
      return declared;
    }
    // Copied for the same reason a delivered page is: what a source hands
    // over reaches published state, and must not move under it afterwards.
    return Object.freeze([...(source.refuses?.(query) ?? [])]);
  };

  const publish = (
    running: Execution,
    delivery: SourceDelivery<TRow>,
  ): void => {
    if (execution !== running) {
      // Released or superseded: that execution never publishes.
      return;
    }
    const settled: Completion<TRow> =
      delivery.status === "succeeded"
        ? {
            status: "succeeded",
            page: {
              ...delivery.page,
              counts: heldCounts(delivery.page.counts, capabilities.counts),
            },
          }
        : delivery;
    if (host.complete(running.requestId, settled)) {
      return;
    }
    if (host.state.get().pendingRequestId !== null) {
      // Another request is already in flight; its own delivery is fresher.
      return;
    }
    // The request settled earlier, so this is an external change to the
    // same query: republish it under a fresh identity.
    driving = true;
    try {
      const next = host.refresh();
      if (next !== null && execution === running) {
        running.requestId = next;
        host.complete(next, settled);
      }
    } finally {
      driving = false;
    }
    // Requests issued by another listener during the republish were
    // invisible above; converge on whatever the host now wants.
    onHostChange();
  };

  const start = (state: CollectionState<TRow>, requestId: string): void => {
    const query = { slice: state.slice, window: state.window };
    const refusals = refusalsFor(query);
    if (refusals.length > 0) {
      host.complete(requestId, { status: "refused", refusals });
      return;
    }
    const started: Execution = { release: null, requestId };
    execution = started;
    let release: () => void;
    try {
      release = source.execute({ requestId, ...query }, (delivery) => {
        publish(started, delivery);
      });
    } catch (error) {
      // A source that cannot even start is a failed request, not an
      // exception thrown back through the host's publication.
      if (execution === started) {
        execution = null;
      }
      host.complete(requestId, {
        status: "failed",
        failure: { reason: reasonOf(error), cause: error, transient: null },
      });
      return;
    }
    if (execution === started) {
      started.release = release;
    } else {
      // Superseded or released during a synchronous delivery: nothing else
      // holds this release, so it is dropped here.
      release();
    }
  };

  function onHostChange(): void {
    if (driving || unsubscribe === null) {
      return;
    }
    const state = host.state.get();
    if (state.disposed) {
      detach();
      return;
    }
    if (state.scope !== scope) {
      scope = state.scope;
      stop();
    }
    const pending = state.pendingRequestId;
    if (pending === null || execution?.requestId === pending) {
      return;
    }
    stop();
    start(state, pending);
  }

  return {
    capabilities,
    supports: refusalsFor,
    async runAction(request: SourceActionRequest): Promise<Operation> {
      const run = source.runAction;
      if (run === undefined) {
        throw new Error("this source declares no row operations");
      }
      const declared = Object.hasOwn(capabilities.actions, request.action)
        ? capabilities.actions[request.action]
        : undefined;
      if (declared === undefined) {
        throw new Error(
          `this source declares no "${request.action}" operation`,
        );
      }
      const { targets } = request;
      if (targets.kind === "query") {
        throw new Error(
          declared.targets === "query" &&
            capabilities.selection.scope === "query"
            ? // Seam: what a query-wide target set means under concurrent
              // writes has no contract yet, so nothing declares it.
              `running "${request.action}" over a whole query is not implemented`
            : `"${request.action}" addresses explicitly captured rows only`,
        );
      }
      const { limit } = declared;
      if (limit !== null && targets.ids.length > limit) {
        throw new Error(
          `"${request.action}" addresses at most ${pluralize(limit, "row")} at a time`,
        );
      }
      const operation = host.invokeAction({
        targets: targets.ids,
        payload: request.payload,
      });
      const captured = operation.state.targets;
      let outcomes: Awaited<ReturnType<typeof run>>;
      try {
        outcomes = await run({
          action: request.action,
          targets: { kind: "explicit", ids: captured },
          payload: request.payload,
        });
      } catch (error) {
        const reason = reasonOf(error);
        outcomes = captured.map((target) => ({
          target,
          status: "failed" as const,
          reason,
        }));
      }
      operation.recordOutcomes(outcomes);
      const unreported = operation.state.remaining;
      if (unreported.length > 0) {
        operation.recordOutcomes(
          unreported.map((target) => ({
            target,
            status: "failed" as const,
            reason: "the source reported no outcome",
          })),
        );
      }
      host.selection.remove(operation.state.succeeded);
      return operation;
    },
    observe(): () => void {
      if (unsubscribe !== null) {
        throw new Error("this binding is already observing its host");
      }
      unsubscribe = host.state.subscribe(onHostChange);
      onHostChange();
      return detach;
    },
  };
}

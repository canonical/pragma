import type {
  CollectionCoordinatorState,
  CompletionResult,
} from "../collection/createCollectionCoordinator.js";
import type { Channel } from "../observable/createChannel.js";
import type { Operation } from "../operation/createOperation.js";
import type { Slice } from "../query/types.js";
import type { Selection } from "../selection/createSelection.js";
import reasonOf from "./reasonOf.js";
import supportsSlice from "./supportsSlice.js";
import type {
  SourceAdapter,
  SourceCapabilities,
  SourceSupport,
} from "./types.js";

/**
 * The structural host surface the binding drives. The handle
 * `createDataViewsProvider` returns satisfies it, and so can a narrower
 * host.
 */
export type SourceHost = {
  /**
   * What the host's source declares it can execute, or null when the host
   * was not told. Non-null, it must be the adapter's own declaration.
   */
  readonly capabilities: SourceCapabilities | null;
  /** The coordinator snapshot channel: query, window and pending request. */
  readonly result: Channel<CollectionCoordinatorState>;
  readonly selection: Selection;
  readonly refresh: () => string | null;
  readonly complete: (requestId: string, result: CompletionResult) => boolean;
  readonly invokeAction: (
    targets: readonly string[],
    payload?: unknown,
  ) => Operation;
};

/** Configuration of one source binding. */
export type SourceBindingConfig = {
  readonly host: SourceHost;
  readonly adapter: SourceAdapter;
};

/** Handle of one source binding. */
export type SourceBinding = {
  /**
   * What the bound source declares it can execute. Connected parts read the
   * host's copy instead; this is for code holding the binding.
   */
  readonly capabilities: SourceCapabilities;
  /**
   * Whether the source can execute a query in hand, with structured
   * refusals. The refusals a request is rejected with reach the result
   * state only as their joined text.
   */
  readonly supports: (slice: Slice) => SourceSupport;
  /**
   * Run one row operation over explicitly captured targets. Resolves with
   * the operation record once every captured target has an outcome — a
   * target the source reports nothing for fails rather than staying
   * pending. Successful targets leave the selection; failures stay for
   * review and retry. Rejects when the source has no row operations.
   */
  readonly runAction: (
    action: string,
    targets: readonly string[],
    payload?: unknown,
  ) => Promise<Operation>;
  /** Detach: releases the live request and stops observing the host. */
  readonly dispose: () => void;
};

/** A list as a set: deduplicated, then sorted. */
const sortedUnique = (list: readonly string[]): string[] =>
  [...new Set(list)].sort();

/**
 * One declaration as a comparable string. Every list in it is a set, so
 * order never matters, and a field declared with no operators is a field
 * not declared.
 */
const declarationOf = (capabilities: SourceCapabilities): string =>
  JSON.stringify([
    sortedUnique(
      Object.entries(capabilities.filter).flatMap(([field, operators]) =>
        (operators ?? []).map((operator) => JSON.stringify([field, operator])),
      ),
    ),
    sortedUnique(capabilities.search),
    sortedUnique(capabilities.sort),
    capabilities.sortTerms,
    sortedUnique(capabilities.group),
    capabilities.count,
  ]);

/** One live execution: the request it runs and how to release it. Its own
 * object identity distinguishes it from every superseding execution. */
type Execution = {
  release: (() => void) | null;
  requestId: string;
};

/**
 * Bind a source adapter to a host's request lifecycle. The host issues
 * request identities; the binding executes exactly the newest one, drops
 * completions from released or superseded executions, refuses a query the
 * source has not declared support for, and republishes a later delivery of
 * the same query under a fresh identity so retained rows never carry
 * another request's provenance. Cache and retry stay the adapter's.
 *
 * One binding owns one host: two bindings on the same host both execute
 * every request and race to complete it.
 */
export default function createSourceBinding(
  config: SourceBindingConfig,
): SourceBinding {
  const { host, adapter } = config;
  const { capabilities } = adapter;
  // The host offers controls from its own copy; one that says something
  // else would offer what this source refuses.
  if (
    host.capabilities !== null &&
    declarationOf(host.capabilities) !== declarationOf(capabilities)
  ) {
    throw new Error(
      "the host was told different capabilities from those its source adapter declares",
    );
  }

  let execution: Execution | null = null;
  let scope = host.result.get().scope;
  /** True while the binding itself is issuing a request on the host. */
  let driving = false;
  let disposed = false;

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
    if (disposed) {
      return;
    }
    disposed = true;
    unsubscribe();
    stop();
  };

  const publish = (running: Execution, result: CompletionResult): void => {
    if (execution !== running) {
      // Released or superseded: a stale execution never publishes.
      return;
    }
    // A source declaring no count never has one published, so an
    // unfiltered total cannot reach the UI as the filtered one.
    const settled: CompletionResult =
      result.status === "success" && capabilities.count === "none"
        ? { status: "success", rows: result.rows, count: null }
        : result;
    if (host.complete(running.requestId, settled)) {
      return;
    }
    if (host.result.get().pendingRequestId !== null) {
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

  const start = (
    state: CollectionCoordinatorState,
    requestId: string,
  ): void => {
    const support = supportsSlice(capabilities, state.slice);
    if (support.status === "unsupported") {
      host.complete(requestId, {
        status: "failure",
        reason: support.refusals.map((refusal) => refusal.reason).join("; "),
      });
      return;
    }
    const started: Execution = { release: null, requestId };
    execution = started;
    let release: () => void;
    try {
      release = adapter.execute(
        { requestId, slice: state.slice, window: state.window },
        (result) => {
          publish(started, result);
        },
      );
    } catch (error) {
      // A source that cannot even start is a failed request, not an
      // exception thrown back through the host's publication.
      if (execution === started) {
        execution = null;
      }
      host.complete(requestId, {
        status: "failure",
        reason: reasonOf(error),
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
    if (driving || disposed) {
      return;
    }
    const state = host.result.get();
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

  const unsubscribe = host.result.subscribe(onHostChange);
  onHostChange();

  return {
    capabilities,
    supports: (slice: Slice) => supportsSlice(capabilities, slice),
    async runAction(
      action: string,
      targets: readonly string[],
      payload?: unknown,
    ): Promise<Operation> {
      const run = adapter.runAction;
      if (run === undefined) {
        throw new Error("this source declares no row operations");
      }
      const operation = host.invokeAction(targets, payload);
      const captured = operation.state.targets;
      let outcomes: Awaited<ReturnType<typeof run>>;
      try {
        outcomes = await run({ action, targets: captured, payload });
      } catch (error) {
        const reason = reasonOf(error);
        outcomes = captured.map((target) => ({
          target,
          status: "failure" as const,
          reason,
        }));
      }
      operation.recordOutcome(outcomes);
      const unreported = operation.state.remaining;
      if (unreported.length > 0) {
        operation.recordOutcome(
          unreported.map((target) => ({
            target,
            status: "failure" as const,
            reason: "the source reported no outcome",
          })),
        );
      }
      host.selection.remove(operation.state.succeeded);
      return operation;
    },
    dispose: detach,
  };
}

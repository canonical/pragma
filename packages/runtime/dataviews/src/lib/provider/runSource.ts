import type { DataViewsState } from "../coordinator/index.js";
import type {
  Completion,
  Count,
  SourceCounts,
  SourceDelivery,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import {
  type CountSupport,
  describeError,
  type Source,
  type SourceCapabilities,
} from "../source/index.js";
import type { PortRun, SourceRunConfig } from "./types.js";

/**
 * Why a declaration is not one the source can keep, or null when every
 * declared capability has the port that serves it. Checked once, when the
 * provider is built, so a declaration is never a promise discovered to be
 * empty at the moment a control depends on it.
 */
const findPortRejection = <TRow extends object>(
  capabilities: SourceCapabilities,
  source: Source<TRow>,
): string | null => {
  const declaresActions = Object.keys(capabilities.actions).length > 0;
  if (declaresActions !== (source.runAction !== undefined)) {
    return declaresActions
      ? "this source declares actions it has no runAction to run"
      : "this source has a runAction but declares no action";
  }
  if (
    capabilities.pagination.kind === "cursor" &&
    source.refusals === undefined
  ) {
    // Only the source knows which pages its tokens reach, so a cursor
    // source that refuses nothing would be asked for pages it cannot serve.
    return "a cursor source must declare which pages it cannot reach through refusals";
  }
  return null;
};

/** One count held to what the declaration allows. */
const holdCount = (count: Count, support: CountSupport): Count => {
  if (support === "unknown" || count.kind === "unknown") {
    return { kind: "unknown" };
  }
  if (!Number.isSafeInteger(count.value) || count.value < 0) {
    // A count that is not a whole number of rows counts nothing: read as a
    // page total it would be NaN, a fraction or a negative.
    return { kind: "unknown" };
  }
  if (support === "at-least" && count.kind === "exact") {
    return { kind: "at-least", value: count.value };
  }
  return count;
};

/** Counts held to what the declaration allows, so no source over-claims. */
const holdCounts = (
  counts: SourceCounts,
  declared: SourceCapabilities["counts"],
): SourceCounts => ({
  pageable: holdCount(counts.pageable, declared.pageable),
  matched: holdCount(counts.matched, declared.matched),
  total: holdCount(counts.total, declared.total),
});

/** One live execution: the request it runs and how to release it. Its own
 * object identity distinguishes it from every superseding execution. */
type Execution = {
  release: (() => void) | null;
  requestId: string;
};

/**
 * Run a source against the host's request lifecycle. The host issues
 * request identities; the run executes exactly the newest one, drops
 * completions from released or superseded executions, refuses a request
 * the source has not declared support for before it costs a round trip,
 * holds every count to what the declaration allows, and republishes a
 * later delivery of the same query under a fresh identity so retained rows
 * never carry another request's provenance. Cache and retry stay the
 * source's.
 *
 * Construction checks the declaration against the source's ports and
 * subscribes to nothing: `observe()` starts, and the release it returns
 * stops the live request and detaches from the host — never the source's
 * own client or cache.
 *
 * @note Impure by design: observing subscribes to the host and starts the
 * source executing; that is what a port run is for.
 */
export default function runSource<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: SourceRunConfig<TFields, TRow>): PortRun {
  const { host, source } = config;
  const { capabilities } = host;
  const rejection = findPortRejection(capabilities, source);
  if (rejection !== null) {
    throw new Error(rejection);
  }

  let execution: Execution | null = null;
  let generation = host.state.get().generation;
  let unsubscribe: (() => void) | null = null;
  /** True while the run itself is issuing a request on the host. */
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
              counts: holdCounts(delivery.page.counts, capabilities.counts),
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
      if (execution === running) {
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

  const start = (state: DataViewsState<TRow>, requestId: string): void => {
    const query = { slice: state.slice, window: state.window };
    const refusals = host.refusals(query);
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
        failure: {
          reason: describeError(error),
          cause: error,
          transient: null,
        },
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
    if (state.generation !== generation) {
      generation = state.generation;
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
    observe(): () => void {
      if (unsubscribe !== null) {
        throw new Error("this source is already running against its host");
      }
      unsubscribe = host.state.subscribe(onHostChange);
      onHostChange();
      return detach;
    },
  };
}

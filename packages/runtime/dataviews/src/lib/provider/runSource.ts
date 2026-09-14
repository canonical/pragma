import type { DataViewsState, ResultState } from "../coordinator/index.js";
import { areListsEqual, type Query } from "../query/index.js";
import {
  type Completion,
  type Count,
  type SourceCounts,
  type SourceDelivery,
  UNKNOWN_COUNT,
} from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import {
  type CountSupport,
  describeError,
  type Source,
  type SourceCapabilities,
} from "../source/index.js";
import type { SourceRun, SourceRunConfig } from "./types.js";

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
    return UNKNOWN_COUNT;
  }
  if (!Number.isSafeInteger(count.value) || count.value < 0) {
    // A count that is not a whole number of rows counts nothing: read as a
    // page total it would be NaN, a fraction or a negative.
    return UNKNOWN_COUNT;
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

/** A request that failed because the source threw, with what it threw. */
const failWith = (error: unknown): Completion<never> => ({
  status: "failed",
  failure: { reason: describeError(error), cause: error, transient: null },
});

/** Whether two counts claim the same: the same kind, and the same value where they carry one. */
const isSameCount = (a: Count, b: Count): boolean =>
  a.kind === "unknown" || b.kind === "unknown"
    ? a.kind === b.kind
    : a.kind === b.kind && a.value === b.value;

/**
 * Whether a completion would publish nothing new over a ready result: the
 * same records, by identity, with the same counts, continuation, cursors and
 * group summaries. A problem, or anything else settled, is never the same.
 */
const isSameResult = <TRow extends object>(
  result: ResultState<TRow>,
  completion: Completion<TRow>,
): boolean => {
  if (result.status !== "ready" || completion.status !== "succeeded") {
    return false;
  }
  const { rows, counts } = result;
  if (rows === null || counts === null) {
    return false;
  }
  const { page } = completion;
  return (
    areListsEqual(rows, page.rows, Object.is) &&
    (result.groups === null
      ? page.groups === null
      : page.groups !== null &&
        areListsEqual(result.groups, page.groups, Object.is)) &&
    isSameCount(counts.pageable, page.counts.pageable) &&
    isSameCount(counts.matched, page.counts.matched) &&
    isSameCount(counts.total, page.counts.total) &&
    result.more === page.more &&
    (result.cursors?.next ?? null) === (page.cursors?.next ?? null) &&
    (result.cursors?.previous ?? null) === (page.cursors?.previous ?? null)
  );
};

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
 * own client or cache. Rows published while nothing ran them are taken up
 * on `observe()` under the request they answer, so the source is live
 * again without asking for the page anew. Unobserved, `completePending()`
 * completes the pending request from what the source can read within the
 * call, starting and subscribing to nothing.
 *
 * @note Impure by design: observing subscribes to the host and starts the
 * source executing, and completing a pending request unobserved reads the
 * source and completes the host's request; that is what a port run is for.
 */
export default function runSource<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(config: SourceRunConfig<TFields, TRow>): SourceRun {
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

  /** A delivery as the host completes it: its counts held to the declaration. */
  const settle = (delivery: SourceDelivery<TRow>): Completion<TRow> =>
    delivery.status === "succeeded"
      ? {
          status: "succeeded",
          page: {
            ...delivery.page,
            counts: holdCounts(delivery.page.counts, capabilities.counts),
          },
        }
      : delivery;

  const publish = (
    running: Execution,
    delivery: SourceDelivery<TRow>,
  ): void => {
    if (execution !== running) {
      // Released or superseded: that execution never publishes.
      return;
    }
    const settled = settle(delivery);
    if (host.complete(running.requestId, settled)) {
      return;
    }
    const { pendingRequestId, result } = host.state.get();
    if (pendingRequestId !== null) {
      // Another request is already in flight; its own delivery is fresher.
      return;
    }
    if (isSameResult(result, settled)) {
      // The same page again — the first answer of an execution taken up over
      // rows already published: there is nothing to republish.
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

  /**
   * Complete a request its query is refused for, and say whether it was: the
   * one check both an execution and a read within the call make first.
   */
  const refuseUnsupported = (query: Query, requestId: string): boolean => {
    const refusals = host.refusals(query);
    if (refusals.length === 0) {
      return false;
    }
    host.complete(requestId, { status: "refused", refusals });
    return true;
  };

  /**
   * Execute one request against the source. A refused request and a source
   * that throws complete instead, leaving no execution.
   */
  const start = (state: DataViewsState<TRow>, requestId: string): void => {
    const query = { slice: state.slice, window: state.window };
    if (refuseUnsupported(query, requestId)) {
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
      host.complete(requestId, failWith(error));
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
    if (pending === null) {
      const { status, provenance } = state.result;
      if (execution === null && status === "ready" && provenance !== null) {
        // Rows published while nothing ran them — answered within a call,
        // or by an observation since released: the source is taken up
        // under the request they answer, so a later change reaches them,
        // and its first answer, the same page, republishes nothing. One that
        // cannot start is asked for as a request, so its refusal or failure
        // is published rather than lost under a settled identity.
        start(state, provenance.requestId);
        if (execution === null) {
          host.refresh();
        }
      }
      return;
    }
    if (execution?.requestId === pending) {
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
    completePending(): void {
      if (unsubscribe !== null) {
        // Observed: the live run has already executed it.
        return;
      }
      const state = host.state.get();
      const pending = state.pendingRequestId;
      if (pending === null) {
        return;
      }
      const query = { slice: state.slice, window: state.window };
      if (refuseUnsupported(query, pending)) {
        return;
      }
      if (source.readDelivery === undefined) {
        // Only an execution could answer, and nothing may start here.
        return;
      }
      let delivery: SourceDelivery<TRow> | null;
      try {
        delivery = source.readDelivery({ requestId: pending, ...query });
      } catch (error) {
        host.complete(pending, failWith(error));
        return;
      }
      if (delivery !== null) {
        host.complete(pending, settle(delivery));
      }
    },
  };
}

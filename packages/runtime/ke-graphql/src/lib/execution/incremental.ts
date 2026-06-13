// =============================================================================
// Incremental delivery support, graphql v17.
//
// - executeLocal: graphql() for plain documents, experimentalExecuteIncrementally
//   when the document uses @defer/@stream
// - mergeIncremental: drain-and-merge fallback — folds every increment into
//   one complete result (used by the handler for non-multipart clients and by
//   Path B static extraction)
// - relayFormatAdapter: translates v17's 2023 payload format
//   (pending/id/incremental/completed) into Relay's legacy shape
//   (path/label per payload, is_final extension)
// =============================================================================

import {
  type DocumentNode,
  type ExecutionResult,
  execute,
  experimentalExecuteIncrementally,
  type GraphQLSchema,
  parse,
} from "graphql";
import type { CompilerContext } from "#shared";
import type {
  IncrementalResults,
  LocalExecutionResult,
  PendingEntry,
  RelayLegacyPayload,
} from "./types.js";

/** Distinguish an incremental result stream from a plain ExecutionResult. */
export const isIncrementalResults = (
  result: LocalExecutionResult,
): result is IncrementalResults =>
  "initialResult" in result && "subsequentResults" in result;

/** Arguments for executeLocal: schema, source text, variables, and context. */
export interface ExecuteLocalArgs {
  schema: GraphQLSchema;
  source: string;
  /**
   * Pre-parsed document. When provided (e.g. the HTTP handler's cached,
   * already-validated document), executeLocal skips its own parse — avoiding
   * a second parse of the same query text on the warm request path.
   */
  document?: DocumentNode;
  variableValues?: Record<string, unknown> | null;
  contextValue: CompilerContext;
  operationName?: string | null;
}

const usesIncrementalDirectives = (source: string): boolean =>
  source.includes("@defer") || source.includes("@stream");

// graphql v17 RC's execute() throws on any schema that carries the @defer or
// @stream directives — even for operations that use neither. Schemas compiled
// with `incremental: true` must therefore always go through the experimental
// executor (which still returns a plain ExecutionResult for plain operations).
const schemaCarriesIncrementalDirectives = (schema: GraphQLSchema): boolean =>
  schema.getDirective("defer") !== undefined ||
  schema.getDirective("stream") !== undefined;

/**
 * Execute a query in-process (SSR prefetch, tests, scripts — no HTTP, no
 * serialization). Documents using @defer/@stream go through the incremental
 * executor and return an IncrementalResults stream; everything else returns
 * a plain ExecutionResult. Syntax errors come back as an errors-only result,
 * matching graphql().
 *
 * @note Impure — resolvers read the store through the context's loaders
 * while the operation executes.
 */
export const executeLocal = async (
  args: ExecuteLocalArgs,
): Promise<LocalExecutionResult> => {
  let document: DocumentNode;
  if (args.document) {
    document = args.document;
  } else {
    try {
      document = parse(args.source);
    } catch (error) {
      return {
        errors: [
          // graphql() would produce the same shape for a syntax error.
          error,
        ],
      } as ExecutionResult;
    }
  }
  const executionArgs = {
    schema: args.schema,
    document,
    variableValues: args.variableValues ?? undefined,
    contextValue: args.contextValue,
    operationName: args.operationName ?? undefined,
  };
  if (
    usesIncrementalDirectives(args.source) ||
    schemaCarriesIncrementalDirectives(args.schema)
  ) {
    return (await experimentalExecuteIncrementally(
      executionArgs,
    )) as LocalExecutionResult;
  }
  return execute(executionArgs);
};

const setAtPath = (
  target: Record<string, unknown>,
  path: ReadonlyArray<string | number>,
  merge: (parent: Record<string, unknown> | unknown[]) => void,
): void => {
  // Walk to the container at `path`; tolerate missing segments (defensive).
  let cursor: unknown = target;
  for (const segment of path) {
    if (cursor == null || typeof cursor !== "object") {
      return;
    }
    cursor = (cursor as Record<string | number, unknown>)[segment];
  }
  if (cursor != null && typeof cursor === "object") {
    merge(cursor as Record<string, unknown> | unknown[]);
  }
};

/**
 * Drain every increment and fold it into one complete ExecutionResult.
 * Correctness-preserving fallback: streaming is lost, data is identical.
 */
export const mergeIncremental = async (
  results: IncrementalResults,
): Promise<ExecutionResult> => {
  const { initialResult, subsequentResults } = results;
  const data = (initialResult.data ?? null) as Record<string, unknown> | null;
  const errors: unknown[] = [...(initialResult.errors ?? [])];
  const pendingById = new Map<string, PendingEntry>();
  for (const pending of initialResult.pending ?? []) {
    pendingById.set(pending.id, pending);
  }

  for await (const payload of subsequentResults) {
    for (const pending of payload.pending ?? []) {
      pendingById.set(pending.id, pending);
    }
    for (const entry of payload.incremental ?? []) {
      const pending = pendingById.get(entry.id);
      if (!pending || data === null) {
        continue;
      }
      const path = [...pending.path, ...(entry.subPath ?? [])];
      if (entry.data !== undefined && entry.data !== null) {
        setAtPath(data, path, (container) => {
          Object.assign(container as Record<string, unknown>, entry.data);
        });
      }
      if (entry.items) {
        setAtPath(data, path, (container) => {
          if (Array.isArray(container)) {
            container.push(...(entry.items as unknown[]));
          }
        });
      }
      if (entry.errors) {
        errors.push(...entry.errors);
      }
    }
    for (const completed of payload.completed ?? []) {
      if (completed.errors) {
        errors.push(...completed.errors);
      }
    }
  }

  return errors.length > 0
    ? ({ data, errors } as ExecutionResult)
    : ({ data } as ExecutionResult);
};

/**
 * Translate graphql v17 incremental results into Relay's legacy payload
 * stream: the initial payload plain, then one payload per deferred fragment /
 * streamed item with path + label, and is_final on the last payload.
 *
 * @experimental Coupled to the graphql v17 RC's 2023 incremental payload
 * format (pending/incremental/completed) — the reason `graphql` is pinned
 * exactly. May need adjustment when the RC payload shape changes.
 */
export async function* relayFormatAdapter(
  results: IncrementalResults,
): AsyncGenerator<RelayLegacyPayload, void, void> {
  const pendingById = new Map<string, PendingEntry>();
  const streamCounters = new Map<string, number>();
  // @stream(initialCount: n): the first incremental item is list index n —
  // seed each stream counter from the length of the array already delivered
  // at the pending path in the initial result.
  const computeInitialIndex = (pending: PendingEntry): number => {
    let cursor: unknown = results.initialResult.data ?? null;
    for (const segment of pending.path) {
      if (cursor == null || typeof cursor !== "object") {
        return 0;
      }
      cursor = (cursor as Record<string | number, unknown>)[segment];
    }
    return Array.isArray(cursor) ? cursor.length : 0;
  };
  for (const pending of results.initialResult.pending ?? []) {
    pendingById.set(pending.id, pending);
  }

  yield {
    data: (results.initialResult.data ?? null) as Record<
      string,
      unknown
    > | null,
    ...(results.initialResult.errors?.length
      ? { errors: results.initialResult.errors }
      : {}),
  };

  const buffered: RelayLegacyPayload[] = [];
  for await (const payload of results.subsequentResults) {
    for (const pending of payload.pending ?? []) {
      pendingById.set(pending.id, pending);
    }
    for (const entry of payload.incremental ?? []) {
      const pending = pendingById.get(entry.id);
      if (!pending) {
        continue;
      }
      if (entry.data !== undefined) {
        buffered.push({
          data: entry.data ?? null,
          path: [...pending.path, ...(entry.subPath ?? [])],
          ...(pending.label ? { label: pending.label } : {}),
          ...(entry.errors?.length ? { errors: entry.errors } : {}),
        });
      }
      for (const item of entry.items ?? []) {
        const index =
          streamCounters.get(entry.id) ?? computeInitialIndex(pending);
        streamCounters.set(entry.id, index + 1);
        buffered.push({
          data: item as Record<string, unknown>,
          path: [...pending.path, index],
          ...(pending.label ? { label: pending.label } : {}),
        });
      }
    }
    // A deferred fragment that fails entirely is reported ONLY via
    // completed[{id, errors}] — translate it so legacy clients see the error.
    for (const completed of payload.completed ?? []) {
      if (!completed.errors?.length) {
        continue;
      }
      const pending = pendingById.get(completed.id);
      buffered.push({
        data: null,
        errors: completed.errors,
        ...(pending ? { path: pending.path } : {}),
        ...(pending?.label ? { label: pending.label } : {}),
      });
    }
    // Flush all but the last buffered payload; the final one needs is_final.
    if (payload.hasNext) {
      while (buffered.length > 0) {
        yield buffered.shift() as RelayLegacyPayload;
      }
    }
  }

  while (buffered.length > 1) {
    yield buffered.shift() as RelayLegacyPayload;
  }
  const last = buffered.shift();
  if (last) {
    yield { ...last, extensions: { ...last.extensions, is_final: true } };
  } else {
    // Everything was flushed while hasNext was still true (or the final
    // payload carried only completed[] bookkeeping) — legacy Relay needs
    // SOME payload with is_final or it treats the operation as incomplete.
    yield { data: null, extensions: { is_final: true } };
  }
}

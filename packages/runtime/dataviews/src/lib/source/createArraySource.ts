import type { CompletionResult } from "../collection/createCollectionCoordinator.js";
import applyWindow from "../query/applyWindow.js";
import type { PredicateOperator, Slice } from "../query/types.js";
import type { RowRecord } from "../rows/types.js";
import copyCapabilities from "./copyCapabilities.js";
import executeSlice, { readProperty } from "./executeSlice.js";
import type {
  FieldReader,
  SourceActionRunner,
  SourceAdapter,
  SourceRequest,
} from "./types.js";

/** Every grammar operator, exhaustively: adding one to the grammar without
 * adding it here fails to type-check. */
const operatorPresence: Readonly<Record<PredicateOperator, true>> = {
  eq: true,
  gte: true,
  lte: true,
  isSet: true,
};
const everyOperator = Object.freeze(
  Object.keys(operatorPresence) as PredicateOperator[],
);

/** Configuration of one local-array source. */
export type ArraySourceConfig = {
  /** The complete record set. Copied at construction; never read live. */
  readonly rows: readonly RowRecord[];
  /** Every field the source filters and sorts. Absent fields are refused. */
  readonly fields: readonly string[];
  /** Fields free-text search reads; none by default, which refuses search. */
  readonly searchFields?: readonly string[];
  /** How one field is read off a row; own-property lookup by default. */
  readonly read?: FieldReader;
  /** Row operations, when the application has any. */
  readonly runAction?: SourceActionRunner;
};

/** A local-array source: an adapter plus the write path its owner keeps. */
export type ArraySource = SourceAdapter & {
  /**
   * Replace the records. Every live request re-executes and delivers
   * again — the external-change path a live local store takes.
   */
  readonly setRows: (rows: readonly RowRecord[]) => void;
};

/**
 * Create a source over a complete local record set. Each request is
 * filtered, searched and sorted over every record and then windowed, so a
 * count is the filtered total rather than one loaded page. Grouping is not
 * executed here, so a grouped query is refused rather than answered with
 * ungrouped rows.
 */
export default function createArraySource(
  config: ArraySourceConfig,
): ArraySource {
  const read = config.read ?? readProperty;
  const searchFields = config.searchFields ?? [];
  const capabilities = copyCapabilities({
    filter: Object.fromEntries(
      config.fields.map((field) => [field, everyOperator]),
    ),
    search: searchFields,
    sort: config.fields,
    sortTerms: null,
    group: [],
    count: "filtered",
  });

  let rows: readonly RowRecord[] = Object.freeze([...config.rows]);
  /** Deliveries of the live requests; each closure is its own registration. */
  const live = new Set<() => void>();
  /** The last executed query and its result, so a window-only change does
   * not re-filter and re-sort every record. */
  let executed: { slice: Slice; matched: readonly RowRecord[] } | null = null;

  const pageFor = (request: SourceRequest): CompletionResult => {
    if (executed === null || executed.slice !== request.slice) {
      executed = {
        slice: request.slice,
        matched: executeSlice(rows, request.slice, {
          read,
          searchFields: capabilities.search,
        }),
      };
    }
    return {
      status: "success",
      rows: applyWindow(executed.matched, request.window),
      count: executed.matched.length,
    };
  };

  return {
    capabilities,
    execute(
      request: SourceRequest,
      deliver: (result: CompletionResult) => void,
    ): () => void {
      const run = (): void => {
        deliver(pageFor(request));
      };
      live.add(run);
      run();
      return () => {
        live.delete(run);
      };
    },
    setRows(next: readonly RowRecord[]): void {
      rows = Object.freeze([...next]);
      executed = null;
      for (const run of [...live]) {
        run();
      }
    },
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
  };
}

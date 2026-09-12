import applyWindow from "../query/applyWindow.js";
import type { PredicateOperator, Slice } from "../query/types.js";
import type { SourceDelivery } from "../result/types.js";
import defaultRowIdentifier from "../rows/defaultRowIdentifier.js";
import type { RowIdentifier, RowRecord } from "../rows/types.js";
import copyCapabilities from "./copyCapabilities.js";
import executeSlice, { readProperty } from "./executeSlice.js";
import type {
  ActionCapabilities,
  FieldReader,
  LookupOutcome,
  Source,
  SourceActionRunner,
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

const exact = (value: number) => ({ kind: "exact" as const, value });

/** Configuration of one local-array source. */
export type ArraySourceConfig<TRow extends object = RowRecord> = {
  /** The complete record set. Copied at construction; never read live. */
  readonly rows: readonly TRow[];
  /** Every field the source filters and sorts. Absent fields are refused. */
  readonly fields: readonly string[];
  /** Fields free-text search reads; none by default, which refuses search. */
  readonly searchFields?: readonly string[];
  /** How one field is read off a row; own-property lookup by default. */
  readonly read?: FieldReader;
  /**
   * Reads one record's stable identity, for lookup by id. Defaults to the
   * record's own `id`, which must then be a non-empty string.
   */
  readonly identify?: RowIdentifier<TRow>;
  /** Row operations by name, with the runner that executes them. */
  readonly actions?: Readonly<Record<string, ActionCapabilities>>;
  /** Runs the declared row operations. Required whenever any is declared. */
  readonly runAction?: SourceActionRunner;
};

/** A local-array source: a source plus the write path its owner keeps. */
export type ArraySource<TRow extends object = RowRecord> = Source<TRow> & {
  /**
   * Replace the records. Every live request re-executes and delivers
   * again — the external-change path a live local store takes.
   */
  readonly setRows: (rows: readonly TRow[]) => void;
};

/**
 * Create a source over a complete local record set. Each request is
 * filtered, searched and sorted over every record and then windowed, so all
 * three counts are exact rather than one loaded page's. Grouping is not
 * executed here, so a grouped query is refused rather than answered with
 * ungrouped rows.
 */
export default function createArraySource<TRow extends object = RowRecord>(
  config: ArraySourceConfig<TRow>,
): ArraySource<TRow> {
  const read = config.read ?? readProperty;
  const identify = config.identify ?? defaultRowIdentifier;
  const searchFields = config.searchFields ?? [];
  const capabilities = copyCapabilities({
    filter: Object.fromEntries(
      config.fields.map((field) => [field, everyOperator]),
    ),
    search: searchFields.length === 0 ? null : { fields: searchFields },
    sort: {
      fields: config.fields,
      terms: null,
      default: [],
      // Complete local input has a stable total order the source does not
      // name: the order the records were given in.
      tiebreak: "opaque",
      collation: null,
    },
    group: { fields: [], depth: 0, summaries: "none", collapse: false },
    counts: { visible: "exact", matched: "exact", total: "exact" },
    pagination: { mode: "offset" },
    selection: { scope: "explicit" },
    lookup: { batch: null },
    actions: config.actions ?? {},
    kinds: null,
  });

  let rows: readonly TRow[] = Object.freeze([...config.rows]);
  /** The identity index, built on the first lookup and kept until the
   * records change. */
  let index: Map<string, TRow> | null = null;
  /** Deliveries of the live requests; each closure is its own registration. */
  const live = new Set<() => void>();
  /** The last executed query and its result, so a window-only change does
   * not re-filter and re-sort every record. */
  let executed: { slice: Slice; matched: readonly TRow[] } | null = null;

  const deliveryFor = (request: SourceRequest): SourceDelivery<TRow> => {
    if (executed === null || executed.slice !== request.slice) {
      executed = {
        slice: request.slice,
        matched: executeSlice(rows, request.slice, { read, searchFields }),
      };
    }
    const matched = exact(executed.matched.length);
    return {
      status: "succeeded",
      page: {
        rows: applyWindow(executed.matched, request.window),
        groups: null,
        counts: { visible: matched, matched, total: exact(rows.length) },
        more: null,
        cursors: null,
      },
    };
  };

  return {
    capabilities,
    execute(
      request: SourceRequest,
      deliver: (delivery: SourceDelivery<TRow>) => void,
    ): () => void {
      const run = (): void => {
        deliver(deliveryFor(request));
      };
      live.add(run);
      run();
      return () => {
        live.delete(run);
      };
    },
    lookup(ids: readonly string[]): Promise<readonly LookupOutcome<TRow>[]> {
      if (index === null) {
        index = new Map<string, TRow>();
        for (const row of rows) {
          index.set(identify(row), row);
        }
      }
      const built = index;
      return Promise.resolve(
        ids.map((id): LookupOutcome<TRow> => {
          const record = built.get(id);
          return record === undefined
            ? { id, status: "missing" }
            : { id, status: "found", record };
        }),
      );
    },
    setRows(next: readonly TRow[]): void {
      rows = Object.freeze([...next]);
      executed = null;
      index = null;
      for (const run of [...live]) {
        run();
      }
    },
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
  };
}

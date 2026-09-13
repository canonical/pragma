import { applyWindow, collapseSortTerms, type Slice } from "../query/index.js";
import type { SourceDelivery } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import { ROOT_NUMERIC_COLLATION } from "./constants.js";
import declareCapabilities from "./declareCapabilities.js";
import executeSlice from "./executeSlice.js";
import type { ArraySource, ArraySourceConfig, SourceRequest } from "./types.js";

const exact = (value: number) => ({ kind: "exact" as const, value });

/**
 * Create a source over a complete local record set. Each request is
 * filtered, searched and ordered over every record and then windowed, so all
 * three counts are exact rather than one loaded page's. Grouping is not
 * executed here, so a grouped query is refused rather than answered with
 * ungrouped rows.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createArraySource<TRow extends object = RowRecord>(
  config: ArraySourceConfig<TRow>,
): ArraySource<TRow> {
  const { schema, collation = ROOT_NUMERIC_COLLATION } = config;
  const searchFields = config.searchFields ?? [];
  const defaultSort = collapseSortTerms(config.defaultSort ?? []);
  const capabilities = declareCapabilities(schema, {
    filter: Object.fromEntries(
      schema.fieldNames.map((field) => [field, true] as const),
    ),
    search: searchFields,
    sort: {
      fields: schema.fieldNames,
      terms: null,
      default: defaultSort,
      // Complete local input has a stable total order the source does not
      // name: the order the records were given in.
      tiebreak: "opaque",
      ...(collation === null ? {} : { collation }),
    },
    counts: { pageable: "exact", matched: "exact", total: "exact" },
    actions: config.actions ?? {},
  });

  let rows: readonly TRow[] = Object.freeze([...config.rows]);
  /** Deliveries of the live requests; each closure is its own registration. */
  const live = new Set<() => void>();
  /** The last executed query and its result, so a window-only change does
   * not re-filter and re-sort every record. */
  let executed: { slice: Slice; matched: readonly TRow[] } | null = null;

  const deliveryFor = (request: SourceRequest): SourceDelivery<TRow> => {
    if (executed === null || executed.slice !== request.slice) {
      executed = {
        slice: request.slice,
        matched: executeSlice(rows, request.slice, {
          schema,
          sort: capabilities.sort,
          searchFields,
        }),
      };
    }
    const matched = exact(executed.matched.length);
    return {
      status: "succeeded",
      page: {
        rows: applyWindow(executed.matched, request.window),
        groups: null,
        counts: { pageable: matched, matched, total: exact(rows.length) },
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
    setRows(next: readonly TRow[]): void {
      rows = Object.freeze([...next]);
      executed = null;
      for (const run of [...live]) {
        run();
      }
    },
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
  };
}

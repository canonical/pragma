import {
  applyWindow,
  collapseSortTerms,
  EMPTY_SLICE,
  type Slice,
  spellSliceKey,
} from "../query/index.js";
import type { Facet, SourceDelivery } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import { ROOT_NUMERIC_COLLATION } from "./constants.js";
import declareCapabilities from "./declareCapabilities.js";
import executeSlice from "./executeSlice.js";
import readFacets from "./readFacets.js";
import type { ArraySource, ArraySourceConfig, SourceRequest } from "./types.js";

/** A count that is exactly this many rows. */
const createExactCount = (value: number) => ({ kind: "exact" as const, value });

/**
 * Create a source over a complete local record set. Each request is
 * filtered, searched and ordered over every record and then windowed, so all
 * three counts are exact rather than one loaded page's, and so is every
 * facet, which it declares for each field that is not text. Grouping is not
 * executed here, so a grouped query is refused rather than answered with
 * ungrouped rows.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function createArraySource<TRow extends object = RowRecord>(
  config: ArraySourceConfig<TRow>,
): ArraySource<TRow> {
  const { collection, collation = ROOT_NUMERIC_COLLATION } = config;
  const { schema } = collection;
  const searchFields = config.searchFields ?? [];
  const defaultSort = collapseSortTerms(config.defaultSort ?? []);
  const capabilities = declareCapabilities(collection, {
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
      ...(config.empties === undefined ? {} : { empties: config.empties }),
    },
    counts: { pageable: "exact", matched: "exact", total: "exact" },
    actions: config.actions ?? {},
    facets: schema.fields
      .filter((definition) => definition.kind !== "text")
      .map((definition) => definition.field),
  });

  let rows: readonly TRow[] = Object.freeze([...config.rows]);
  /** Deliveries of the live requests; each closure is its own registration. */
  const live = new Set<() => void>();
  /** The last executed query and the records it matched, in order, so a
   * window-only change does not re-filter and re-sort every record. */
  let executed: { slice: Slice; matched: readonly TRow[] } | null = null;
  /** The facets last computed, with the query, the selection and the facet
   * list they answer, so another list over the same query reuses the rows it
   * selected, and another order of the same selection reuses the facets. */
  let faceted: {
    slice: Slice;
    selectionKey: string;
    key: string;
    facets: Readonly<Record<string, Facet>>;
  } | null = null;

  /** The definitions of the facets a request asks for, each one declared. */
  const listFacetDefinitions = (
    request: SourceRequest,
  ): readonly SchemaFieldDefinition[] =>
    request.facets.map((field) => {
      const definition = schema.findField(field);
      if (definition === undefined || !capabilities.facets.includes(field)) {
        throw new Error(`this source declares no facet for "${field}"`);
      }
      return definition;
    });

  /** The key of what a slice selects: its filter and search, never its
   * order, which no facet depends on. */
  const spellSelectionKey = (slice: Slice): string =>
    spellSliceKey({
      ...EMPTY_SLICE,
      filter: slice.filter,
      search: slice.search,
    });

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
    const key = request.facets.join("\u0000");
    // The same slice selects the same rows; another may too, ordered apart.
    const selectionKey =
      faceted !== null && faceted.slice === request.slice
        ? faceted.selectionKey
        : spellSelectionKey(request.slice);
    if (
      faceted === null ||
      faceted.selectionKey !== selectionKey ||
      faceted.key !== key
    ) {
      faceted = {
        slice: request.slice,
        selectionKey,
        key,
        facets: readFacets(
          rows,
          request.slice,
          listFacetDefinitions(request),
          { schema, searchFields },
          executed.matched,
        ),
      };
    } else {
      // Held under this slice, so its next delivery spells no key.
      faceted.slice = request.slice;
    }
    const matched = createExactCount(executed.matched.length);
    return {
      status: "succeeded",
      page: {
        rows: applyWindow(executed.matched, request.window),
        groups: null,
        counts: {
          pageable: matched,
          matched,
          total: createExactCount(rows.length),
        },
        facets: faceted.facets,
        more: null,
        cursors: null,
      },
    };
  };

  return {
    capabilities,
    // Complete local input always holds the answer.
    readDelivery: deliveryFor,
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
      faceted = null;
      for (const run of [...live]) {
        run();
      }
    },
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
  };
}

import { canonicalizeSlice, type Slice } from "../query/index.js";
import {
  resolveFieldKind,
  type Schema,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import type { SliceReading } from "./types.js";

/**
 * Read one slice by field, typed from the schema. A predicate on a field
 * the schema does not define is left out: it can carry no applied value
 * of any kind, and the declaration would have refused it before this.
 *
 * A number or date filter reads as its bounds, `gte` and `lte`, each
 * present only when the slice carries it; a `choices` filter as the set of
 * its options; a flag as `true`. The search text and the ordered sort
 * terms come as they are, canonicalized.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function readSlice<
  const TFields extends readonly SchemaFieldDefinition[],
>(schema: Schema<TFields>, slice: Slice): SliceReading<TFields> {
  const canonical = canonicalizeSlice(slice);
  const filters: Record<string, unknown> = {};
  /** The range bounds read so far, one record per bounded field. */
  const bounds: Record<string, Record<string, unknown>> = {};
  for (const predicate of canonical.filter) {
    const definition = schema.findField(predicate.field);
    if (definition === undefined) {
      continue;
    }
    const applied = resolveFieldKind(definition.kind).readApplied(predicate);
    if (predicate.operator === "gte" || predicate.operator === "lte") {
      const range = bounds[predicate.field] ?? {};
      range[predicate.operator] = applied;
      bounds[predicate.field] = range;
      filters[predicate.field] = range;
    } else {
      filters[predicate.field] = applied;
    }
  }
  return {
    // Keyed by the schema's own literal field names, which is what the walk
    // above produced; the map type is what the walk can say.
    filters: filters as SliceReading<TFields>["filters"],
    search: canonical.search,
    sort: canonical.sort,
  };
}

import type { Collection } from "../collection/index.js";
import { canonicalizeSlice, type Slice } from "../query/index.js";
import {
  resolveFieldKind,
  type SchemaFieldDefinition,
} from "../schema/index.js";
import type { SliceReading } from "./types.js";

/**
 * Read one slice by field, typed from the collection's schema. A predicate on a field
 * the schema does not define is left out: it can carry no applied value
 * of any kind, and the declaration would have refused it before this.
 *
 * A field whose kind accepts several operators reads as a record of them,
 * each present only when the slice carries it: a number or date filter as
 * its bounds, `gte` and `lte`; a `choices` filter as the sets `isAny` and
 * `isNone`; a text filter as the text it `contains` and `startsWith`. A flag,
 * whose kind accepts one, reads as `true`. The search text and the ordered
 * sort terms come as they are, canonicalized.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function readSlice<
  const TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
>(collection: Collection<TFields, TRow>, slice: Slice): SliceReading<TFields> {
  const { schema } = collection;
  const canonical = canonicalizeSlice(slice);
  const filters: Record<string, unknown> = {};
  /** What each field read so far holds, by operator, for a kind with several. */
  const byField: Record<string, Record<string, unknown>> = {};
  for (const predicate of canonical.filter) {
    const definition = schema.findField(predicate.field);
    if (definition === undefined) {
      continue;
    }
    const applied = resolveFieldKind(definition.kind).readApplied(predicate);
    if (schema.listOperators(predicate.field).length > 1) {
      const byOperator = byField[predicate.field] ?? {};
      byOperator[predicate.operator] = applied;
      byField[predicate.field] = byOperator;
      filters[predicate.field] = byOperator;
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

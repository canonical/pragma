import type {
  FilterHandle,
  FilterHandles,
  PredicateOperator,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";

/**
 * Read one filter handle off a root's records by its address.
 *
 * The root holds the widest handle map, keyed by an open string rather
 * than the literal field names of one schema. The caller reaches this by
 * walking that same schema, or by a field and operator the schema's types
 * accepted, and names the applied type that field's kind publishes;
 * nothing here checks it. A handle the root does not hold is a control
 * built against another collection, and that is reported rather than read
 * as a value.
 */
export default function findFilterHandle<TApplied>(
  filters: FilterHandles<readonly SchemaFieldDefinition[]>,
  field: string,
  operator: PredicateOperator,
): FilterHandle<TApplied> {
  const byField = filters as Readonly<
    Partial<
      Record<string, Readonly<Partial<Record<string, FilterHandle<unknown>>>>>
    >
  >;
  const handle = byField[field]?.[operator];
  if (handle === undefined) {
    throw new Error(`the root holds no filter for ${field} ${operator}`);
  }
  // The caller names the applied type the field's kind publishes at this
  // address; the map itself is keyed too widely to say.
  return handle as FilterHandle<TApplied>;
}

import type {
  DataViewsProvider,
  FieldHandle,
  PredicateOperator,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";

/**
 * Read one field handle off a provider by its address.
 *
 * The context stores the widest provider shape, whose field map is keyed by
 * an open string rather than the literal field names of one schema. The
 * caller reaches this by walking that same schema, and names the applied
 * type that field's kind publishes; nothing here checks it. A handle the
 * provider does not hold is a control built against another schema, and
 * that is reported rather than read as a value.
 */
export default function handleFor<TApplied>(
  provider: DataViewsProvider<readonly SchemaFieldDefinition[]>,
  field: string,
  operator: PredicateOperator,
): FieldHandle<TApplied> {
  const byField = provider.fields as unknown as Readonly<
    Partial<
      Record<string, Readonly<Partial<Record<string, FieldHandle<TApplied>>>>>
    >
  >;
  const handle = byField[field]?.[operator];
  if (handle === undefined) {
    throw new Error(`the provider holds no handle for ${field} ${operator}`);
  }
  return handle;
}

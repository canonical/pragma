import type {
  DataViewsProvider,
  PredicateOperator,
  ProviderFieldHandle,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";

/**
 * Read one field handle off a provider by its address.
 *
 * The context stores the widest provider shape, whose field map is keyed by
 * an open string rather than the literal field names of one schema. The
 * caller reaches this by walking that same schema, and names the applied
 * type that field's kind publishes; nothing here checks it.
 */
export default function handleFor<TApplied>(
  provider: DataViewsProvider<readonly SchemaFieldDefinition[]>,
  field: string,
  operator: PredicateOperator,
): ProviderFieldHandle<TApplied> {
  const byField = provider.fields as unknown as Readonly<
    Record<string, Readonly<Record<string, ProviderFieldHandle<TApplied>>>>
  >;
  return byField[field][operator];
}

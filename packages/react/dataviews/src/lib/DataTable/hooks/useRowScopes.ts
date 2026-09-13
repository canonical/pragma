import type {
  DataViewsProvider,
  SchemaFieldDefinition,
} from "@canonical/dataviews-core";
import {
  createRowScopes,
  type RowScopes,
} from "@canonical/dataviews-core/bindings";
import { useEffect, useMemo } from "react";

/**
 * The row-scope registry of one mounted table.
 *
 * The registry is minted per provider and observed field list. The caller
 * holds that list at a stable reference — a caller who rebuilds its column
 * array on every render must not re-mint one scope, one channel or one
 * subscription. Scopes live for as long as their row is modelled and the
 * registry dies with the table.
 */
export default function useRowScopes<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
>(
  provider: DataViewsProvider<TFields, TRow>,
  fields: readonly string[],
): RowScopes<TRow> {
  const scopes = useMemo(
    () =>
      createRowScopes<TRow>({
        rows: provider.rows,
        selection: provider.selection,
        fields,
      }),
    [provider, fields],
  );
  // Subscribed from an effect, never from the render that built it: React
  // may discard a render — StrictMode double-invokes the body, and a
  // concurrent render can be thrown away — and a registry that subscribed
  // at construction would go on observing with nothing left to detach it.
  useEffect(() => scopes.observe(), [scopes]);
  return scopes;
}

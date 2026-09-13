import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import { PROVIDER_HOSTS } from "./constants.js";
import type { DataViewsProvider, ProviderHost } from "./types.js";

/**
 * The internal host of a provider, for a framework binding: the record
 * readers, the predicate commands and the request lifecycle a binding
 * drives. Throws for anything that is not a provider this package built.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function readProviderHost<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(provider: DataViewsProvider<TFields, TRow>): ProviderHost<TFields, TRow> {
  const host = PROVIDER_HOSTS.get(provider);
  if (host === undefined) {
    throw new Error(
      "readProviderHost requires a provider created by createDataViewsProvider",
    );
  }
  // Registered with the provider's own type, and read back at it.
  return host as ProviderHost<TFields, TRow>;
}

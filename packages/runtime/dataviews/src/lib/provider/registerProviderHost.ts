import type { RowRecord } from "../rows/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import { PROVIDER_HOSTS } from "./constants.js";
import type { DataViewsProvider, ProviderHost } from "./types.js";

/**
 * Pair a provider with its host. Called once, by the provider's factory:
 * the provider carries no member pointing at the host, and the only way
 * from one to the other is the registry.
 *
 * @note Impure by design: writes the provider domain's registry.
 */
export default function registerProviderHost<
  TFields extends readonly SchemaFieldDefinition[],
  TRow extends object = RowRecord,
>(
  provider: DataViewsProvider<TFields, TRow>,
  host: ProviderHost<TFields, TRow>,
): void {
  PROVIDER_HOSTS.set(provider, host);
}

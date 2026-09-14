import type { Schema, SchemaFieldDefinition } from "../schema/index.js";
import { isOwnedKey, VIEW_KEY } from "../wire/index.js";

/** Configuration of one reading of a location's parameters. */
type CarryingQueryConfig = {
  readonly params: URLSearchParams;
  /** The schema whose fields the parameters may address. */
  readonly schema: Schema<readonly SchemaFieldDefinition[]>;
  /** Whether the provider keeps saved views, so an open view is a query. */
  readonly keepsViews: boolean;
};

/**
 * Whether a location's parameters carry a query of this collection: any
 * parameter the grammar writes, a field of the schema addresses, or — where
 * the provider keeps saved views — the view it has open. A location carrying
 * none takes the provider's query instead of giving it one.
 */
export default function isCarryingQuery(config: CarryingQueryConfig): boolean {
  const { params, schema, keepsViews } = config;
  return Array.from(params.keys()).some((key) =>
    key === VIEW_KEY ? keepsViews : isOwnedKey(key, schema),
  );
}

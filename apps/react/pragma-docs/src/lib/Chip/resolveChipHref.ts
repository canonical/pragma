import { ROUTE_PREFIX_BY_KIND } from "./constants.js";
import {
  assertNonEmptyString,
  getKindEncoding,
  type Kind,
} from "./encodings.js";

/**
 * Resolves the canonical landing href for a mentioned entity — the default
 * implementation of the D31 landing rule (a chip click lands on the noun's
 * home). Kept separate from `Chip` so routing stays decoupled: the docsite
 * passes the result (or its own resolver's) through the `href` prop.
 *
 * Until the real landing map exists, every kind resolves to its anticipated
 * route prefix with the full prefixed URI as the terminal, percent-encoded
 * segment, e.g. `resolveChipHref("ds:global.component.button", "component")`
 * → `/components/ds%3Aglobal.component.button`.
 */
export function resolveChipHref(uri: string, kind: Kind): string {
  assertNonEmptyString(uri, "uri");
  // Validates the kind at runtime for untyped callers (MDX, graph data).
  getKindEncoding(kind);
  return `${ROUTE_PREFIX_BY_KIND[kind]}/${encodeURIComponent(uri)}`;
}

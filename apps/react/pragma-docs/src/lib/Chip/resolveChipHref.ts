import { ROUTE_PREFIX_BY_KIND } from "./constants.js";
import {
  assertNonEmptyString,
  getKindEncoding,
  KINDS,
  type Kind,
} from "./encodings.js";

/** Narrows a URI segment to a registered {@link Kind}. */
function isKind(value: string): value is Kind {
  return (KINDS as readonly string[]).includes(value);
}

/**
 * The kind a URI's local name encodes, when it encodes one: the first
 * interior dot-delimited segment after the tier that names a registered kind
 * (`ds:global.component.button` → `component`). `undefined` for URIs whose
 * local name asserts no kind (`cs:typescript.imports`). Exported for
 * callers that must trust the URI over their own default (the
 * NeighbourhoodWell's mixed connections, where a `subcomponents` edge can
 * legally deliver a pattern).
 */
export function detectKindInUri(uri: string): Kind | undefined {
  const localName = uri.split(":").at(-1) ?? uri;
  // Interior segments only: the first is the tier, the last the entity name.
  return localName.split(".").slice(1, -1).find(isKind);
}

/**
 * Resolves the canonical landing href for a mentioned entity — the default
 * implementation of the D31 landing rule (a chip click lands on the noun's
 * home). Kept separate from `Chip` so routing stays decoupled: the docsite
 * passes the result (or its own resolver's) through the `href` prop.
 *
 * `kind` must be the URI's true kind: the address is derived from `kind`, so
 * a wrong one lands the mention on the wrong route. When the URI's local
 * name itself encodes a kind segment, a disagreeing `kind` argument gets a
 * dev-only warning — never a throw, and the address shape is unchanged. The
 * full D31 landing map will supersede this address form.
 *
 * Until that map exists, every kind resolves to its anticipated route prefix
 * with the full prefixed URI as the terminal, percent-encoded segment, e.g.
 * `resolveChipHref("ds:global.component.button", "component")`
 * → `/components/ds%3Aglobal.component.button`.
 */
export function resolveChipHref(uri: string, kind: Kind): string {
  assertNonEmptyString(uri, "uri");
  // Validates the kind at runtime for untyped callers (MDX, graph data).
  getKindEncoding(kind);
  if (import.meta.env.DEV) {
    const encodedKind = detectKindInUri(uri);
    if (encodedKind !== undefined && encodedKind !== kind) {
      console.warn(
        `Chip: kind "${kind}" disagrees with the "${encodedKind}" segment ` +
          `in uri "${uri}" — pass the URI's true kind (the href still ` +
          `derives from "${kind}")`,
      );
    }
  }
  return `${ROUTE_PREFIX_BY_KIND[kind]}/${encodeURIComponent(uri)}`;
}

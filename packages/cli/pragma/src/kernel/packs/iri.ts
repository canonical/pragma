/**
 * IRI utilities for pack lookups addressed by prefixed name or absolute IRI.
 *
 * `resolveUri` expands a prefixed name through the store's merged prefix map (a
 * registered prefix always wins; a foreign absolute IRI passes through);
 * `isEmbeddableIri` is the stricter `scheme://…` shape a resolved IRI must match
 * before it can be interpolated into a generated `<iri>` query token.
 */

import { PragmaError } from "../error/PragmaError.js";

/** Characters not allowed inside a SPARQL `<IRI>`. */
const UNSAFE_IRI_PATTERN = /[<>"{}|\\^`\s]/;

/** A general absolute IRI: `scheme://…` (http, https, …) or a `urn:` opaque IRI. */
const ABSOLUTE_IRI_PATTERN = /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|urn:)\S/i;

/** The embeddable-IRI shape: an authority-bearing `scheme://…` with no IRI-breakers. */
const EMBEDDABLE_IRI_PATTERN = /^[A-Za-z][\w+.-]*:\/\/[^<>"\s]+$/;

/** Whether a resolved IRI is safe to embed as a `<iri>` query token. */
export function isEmbeddableIri(value: string): boolean {
  return EMBEDDABLE_IRI_PATTERN.test(value);
}

/**
 * Resolve a prefixed or absolute URI to its full form.
 *
 * @param uri - A full or prefixed URI string.
 * @param prefixes - The store's merged prefix→namespace map.
 * @returns The fully expanded URI.
 * @throws PragmaError INVALID_INPUT when the format is invalid or the prefix is unknown.
 */
export function resolveUri(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  const colonIdx = uri.indexOf(":");
  if (colonIdx === -1) {
    throw PragmaError.invalidInput("uri", uri, {
      recovery: {
        message:
          'Use a prefixed URI (e.g. "ds:global.component.button") or a full URI.',
      },
    });
  }

  const prefix = uri.slice(0, colonIdx);
  const namespace = prefixes[prefix];
  if (namespace !== undefined) {
    const resolved = `${namespace}${uri.slice(colonIdx + 1)}`;
    assertSafeIri(resolved);
    return resolved;
  }

  if (ABSOLUTE_IRI_PATTERN.test(uri)) {
    assertSafeIri(uri);
    return uri;
  }

  throw PragmaError.invalidInput("prefix", prefix, {
    validOptions: Object.keys(prefixes),
    recovery: {
      message: "List known ontology prefixes.",
      cli: "pragma ontology list",
      mcp: { tool: "ontology_list" },
    },
  });
}

/** @throws PragmaError INVALID_INPUT when the URI contains IRI-breaking characters. */
function assertSafeIri(uri: string): void {
  if (UNSAFE_IRI_PATTERN.test(uri)) {
    throw PragmaError.invalidInput("uri", uri, {
      recovery: { message: "URI contains characters not allowed in IRIs." },
    });
  }
}

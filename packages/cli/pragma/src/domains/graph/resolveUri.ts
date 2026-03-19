/**
 * Resolve a potentially prefixed URI (e.g., `ds:UIBlock`) to a full URI.
 * If the URI is already a full URI (starts with `http`), validates IRI safety
 * and returns as-is.
 *
 * @throws PragmaError.invalidInput if the URI format is invalid or prefix unknown.
 */

import { PragmaError } from "../../error/index.js";

/** Characters not allowed in IRI references inside `<...>` in SPARQL. */
const UNSAFE_IRI_PATTERN = /[<>"{}|\\^`\s]/;

export default function resolveUri(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    validateIri(uri);
    return uri;
  }

  const colonIdx = uri.indexOf(":");
  if (colonIdx === -1) {
    throw PragmaError.invalidInput("uri", uri, {
      recovery:
        'Use a prefixed URI (e.g., "ds:button") or a full URI (e.g., "https://ds.canonical.com/button").',
    });
  }

  const prefix = uri.slice(0, colonIdx);
  const localName = uri.slice(colonIdx + 1);
  const namespace = prefixes[prefix];

  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", prefix, {
      validOptions: Object.keys(prefixes),
      recovery: "Run `pragma ontology list` to see known prefixes.",
    });
  }

  const resolved = `${namespace}${localName}`;
  validateIri(resolved);
  return resolved;
}

/**
 * Reject URIs containing characters that would break SPARQL `<IRI>` syntax
 * or enable injection.
 */
function validateIri(uri: string): void {
  if (UNSAFE_IRI_PATTERN.test(uri)) {
    throw PragmaError.invalidInput("uri", uri, {
      recovery: "URI contains characters not allowed in IRIs.",
    });
  }
}

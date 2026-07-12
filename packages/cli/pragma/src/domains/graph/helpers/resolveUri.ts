import { PragmaError } from "#error";

/**
 * Characters not allowed inside `<IRI>` in SPARQL.
 * Mirrors `validateIri` from `@canonical/ke`.
 */
const UNSAFE_IRI_PATTERN = /[<>"{}|\\^`\s]/;

/**
 * Matches a general absolute IRI: any scheme with an authority (`scheme://…`,
 * covering http, https, ftp, ws, and foreign schemes) or a `urn:` opaque IRI.
 * Broader than an http(s)-only check so foreign ontologies resolve.
 */
const ABSOLUTE_IRI_PATTERN = /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|urn:)\S/i;

/**
 * Resolves a potentially prefixed URI (e.g. `ds:UIBlock`) to a full URI.
 *
 * A registered prefix always wins: `ds:UIBlock` expands via the prefix map.
 * Otherwise a general absolute IRI (`scheme://…` or `urn:…`) is validated and
 * returned as-is, so foreign ontologies are not rejected as unknown prefixes.
 * Any other `token:rest` is treated as an unknown prefix.
 *
 * @param uri - A full or prefixed URI string.
 * @param prefixes - Registered prefix-to-namespace mapping from the store.
 * @returns The fully expanded URI string.
 * @throws PragmaError.invalidInput if the URI format is invalid or the prefix is unknown.
 */
export default function resolveUri(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  const colonIdx = uri.indexOf(":");
  if (colonIdx === -1) {
    throw PragmaError.invalidInput("uri", uri, {
      recovery: {
        message:
          'Use a prefixed URI (e.g., "ds:global.component.button") or a full URI (e.g., "https://ds.canonical.com/global.component.button").',
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

/**
 * Reject URIs containing characters that would break SPARQL `<IRI>` syntax
 * or enable injection.
 */
function assertSafeIri(uri: string): void {
  if (UNSAFE_IRI_PATTERN.test(uri)) {
    throw PragmaError.invalidInput("uri", uri, {
      recovery: { message: "URI contains characters not allowed in IRIs." },
    });
  }
}

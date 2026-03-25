import { PragmaError } from "#error";

/**
 * Characters not allowed inside `<IRI>` in SPARQL.
 * Mirrors `validateIri` from `@canonical/ke`.
 */
const UNSAFE_IRI_PATTERN = /[<>"{}|\\^`\s]/;

/**
 * Resolves a potentially prefixed URI (e.g. `ds:UIBlock`) to a full URI.
 *
 * If the URI is already a full URI (starts with `http`), validates IRI safety
 * and returns it as-is. Otherwise, expands the prefix using the provided
 * prefix map.
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
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    assertSafeIri(uri);
    return uri;
  }

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
  const localName = uri.slice(colonIdx + 1);
  const namespace = prefixes[prefix];

  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", prefix, {
      validOptions: Object.keys(prefixes),
      recovery: {
        message: "List known ontology prefixes.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }

  const resolved = `${namespace}${localName}`;
  assertSafeIri(resolved);
  return resolved;
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

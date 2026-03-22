import { PragmaError } from "#error";

/**
 * Resolves a prefix string or full namespace URI to both prefix and namespace.
 *
 * Accepts either a short prefix (e.g. `ds`) or a full namespace URI
 * (e.g. `https://ds.canonical.com/`) and returns the matching pair.
 *
 * @param prefixOrUri - A short prefix or full namespace URI.
 * @param prefixes - Registered prefix-to-namespace mapping from the store.
 * @returns An object with `prefix` and `namespace` strings.
 * @throws PragmaError.invalidInput if the prefix or namespace is unknown.
 */
export default function resolvePrefix(
  prefixOrUri: string,
  prefixes: Readonly<Record<string, string>>,
): { prefix: string; namespace: string } {
  if (prefixOrUri.startsWith("http://") || prefixOrUri.startsWith("https://")) {
    const entry = Object.entries(prefixes).find(([, ns]) => ns === prefixOrUri);
    if (entry) return { prefix: entry[0], namespace: entry[1] };

    throw PragmaError.invalidInput("namespace", prefixOrUri, {
      validOptions: Object.values(prefixes),
      recovery: {
        message: "List loaded ontology namespaces.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }

  const namespace = prefixes[prefixOrUri];
  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", prefixOrUri, {
      validOptions: Object.keys(prefixes),
      recovery: {
        message: "List loaded ontologies.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }

  return { prefix: prefixOrUri, namespace };
}

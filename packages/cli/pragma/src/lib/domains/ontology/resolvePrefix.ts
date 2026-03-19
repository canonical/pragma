/**
 * Resolve a prefix string or namespace URI to both prefix and namespace.
 *
 * @throws PragmaError.invalidInput if the prefix is unknown.
 */

import { PragmaError } from "../../../error/index.js";

export default function resolvePrefix(
  prefixOrUri: string,
  prefixes: Readonly<Record<string, string>>,
): { prefix: string; namespace: string } {
  if (prefixOrUri.startsWith("http://") || prefixOrUri.startsWith("https://")) {
    const entry = Object.entries(prefixes).find(([, ns]) => ns === prefixOrUri);
    if (entry) return { prefix: entry[0], namespace: entry[1] };

    throw PragmaError.invalidInput("namespace", prefixOrUri, {
      validOptions: Object.values(prefixes),
      recovery: "Run `pragma ontology list` to see loaded namespaces.",
    });
  }

  const namespace = prefixes[prefixOrUri];
  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", prefixOrUri, {
      validOptions: Object.keys(prefixes),
      recovery: "Run `pragma ontology list` to see loaded ontologies.",
    });
  }

  return { prefix: prefixOrUri, namespace };
}

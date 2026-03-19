/**
 * Show detailed schema for a namespace — classes and properties.
 *
 * Accepts a short prefix (`ds`) or full namespace URI.
 *
 * @throws PragmaError.invalidInput if the prefix or namespace is unknown.
 * @throws PragmaError.notFound if the namespace has no classes or properties.
 */

import type { Store } from "@canonical/ke";
import { PragmaError } from "../../error/index.js";
import type { OntologyDetailed } from "../shared/types.js";
import queryClasses from "./queryClasses.js";
import queryProperties from "./queryProperties.js";
import resolvePrefix from "./resolvePrefix.js";

export default async function showOntology(
  store: Store,
  prefixOrUri: string,
): Promise<OntologyDetailed> {
  const { prefix, namespace } = resolvePrefix(prefixOrUri, store.prefixes);

  const classes = await queryClasses(store, namespace);
  const properties = await queryProperties(store, namespace);

  if (classes.length === 0 && properties.length === 0) {
    throw PragmaError.notFound("ontology", prefixOrUri, {
      recovery: "Run `pragma ontology list` to see loaded ontologies.",
    });
  }

  return { prefix, namespace, classes, properties };
}

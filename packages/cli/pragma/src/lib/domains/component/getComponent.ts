/**
 * Operations that query the ke store for detailed component data.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "../../../error/index.js";
import { buildFilters } from "../filters/buildFilters.js";
import { buildQuery } from "../shared/buildQuery.js";
import type {
  ComponentDetailed,
  FilterConfig,
  StandardRef,
  TokenRef,
} from "../shared/types.js";
import { extractLocalName } from "./extractLocalName.js";

/**
 * Get detailed information for a single component.
 *
 * Queries the ke store for a ds:Component by name, then fetches its modifiers
 * with values, implementation paths across frameworks, and token references.
 * Tier visibility and channel release filters are applied to the base lookup.
 *
 * @note Impure — performs SPARQL queries against the ke store.
 * @throws PragmaError.notFound if the component does not exist.
 */
export async function getComponent(
  store: Store,
  name: string,
  filters: FilterConfig,
): Promise<ComponentDetailed> {
  const escaped = escapeSparqlValue(name);
  const filterClauses = buildFilters(filters);

  // Base query: find the component
  const baseResult = await store.query(
    buildQuery(`
      SELECT ?component ?tier
      WHERE {
        ?component a ds:Component ;
                   ds:name ${escaped} ;
                   ds:tier ?tier .
        ${filterClauses}
      }
      LIMIT 1
    `),
  );

  if (baseResult.type !== "select" || baseResult.bindings.length === 0) {
    throw PragmaError.notFound("component", name, {
      recovery: "Run `pragma component list` to see available components.",
    });
  }

  const base = baseResult.bindings[0]!;
  const componentUri = base.component;

  // Modifiers with values
  const modResult = await store.query(
    buildQuery(`
      SELECT ?modName ?value
      WHERE {
        <${componentUri}> ds:modifier ?mod .
        ?mod ds:modifierName ?modName ;
             ds:hasValue ?value .
      }
      ORDER BY ?modName ?value
    `),
  );

  const modifierMap = new Map<string, string[]>();
  if (modResult.type === "select") {
    for (const b of modResult.bindings) {
      const existing = modifierMap.get(b.modName ?? "") ?? [];
      existing.push(b.value ?? "");
      modifierMap.set(b.modName ?? "", existing);
    }
  }

  // Implementations
  const implResult = await store.query(
    buildQuery(`
      SELECT ?framework ?path
      WHERE {
        ?lib ds:hasImplementation ?impl .
        ?impl ds:implementsBlock <${componentUri}> ;
              ds:headLink ?path .
        ?lib ds:platform ?framework .
      }
      ORDER BY ?framework
    `),
  );

  const implementationPaths =
    implResult.type === "select"
      ? implResult.bindings.map((b) => ({
          framework: b.framework ?? "",
          path: b.path ?? "",
        }))
      : [];

  // Build implementations summary (which frameworks are available)
  const frameworkSet = new Set(implementationPaths.map((i) => i.framework));
  const allFrameworks = await listAllFrameworks(store);
  const implementations = allFrameworks.map((fw) => ({
    framework: fw,
    available: frameworkSet.has(fw),
  }));

  // Tokens
  const tokenResult = await store.query(
    buildQuery(`
      SELECT ?token ?tokenId
      WHERE {
        <${componentUri}> ds:usesToken ?token .
        ?token ds:tokenId ?tokenId .
      }
      ORDER BY ?tokenId
    `),
  );

  const tokens: TokenRef[] =
    tokenResult.type === "select"
      ? tokenResult.bindings.map((b) => ({
          uri: (b.token ?? "") as URI,
          name: b.tokenId ?? "",
        }))
      : [];

  // Standards (not linked directly to components in current ontology;
  // will be populated via @follows in v0.2)
  const standards: StandardRef[] = [];

  return {
    uri: (componentUri ?? "") as URI,
    name,
    tier: extractLocalName(base.tier ?? ""),
    modifiers: [...modifierMap.keys()],
    implementations,
    nodeCount: 0,
    tokenCount: tokens.length,
    anatomy: null,
    modifierValues: [...modifierMap.entries()].map(([family, values]) => ({
      family,
      values,
    })),
    implementationPaths,
    tokens,
    standards,
  };
}

/**
 * Get all known implementation frameworks from the store.
 *
 * @note Impure — performs a SPARQL query against the ke store.
 */
async function listAllFrameworks(store: Store): Promise<string[]> {
  const result = await store.query(
    buildQuery(`
      SELECT DISTINCT ?framework
      WHERE {
        ?lib a ds:ImplementationLibrary ;
             ds:platform ?framework .
      }
      ORDER BY ?framework
    `),
  );

  if (result.type !== "select") return [];
  return result.bindings.map((b) => b.framework ?? "");
}

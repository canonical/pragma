/**
 * Get detailed information for a single component.
 *
 * Pure function: Store + name + FilterConfig → ComponentDetailed.
 * Consumed by CLI commands and MCP adapter.
 *
 * @throws PragmaError.notFound if the component does not exist.
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "../../../error/index.js";
import { buildFilters } from "../../filters/buildFilters.js";
import { buildQuery } from "../../shared/buildQuery.js";
import { P } from "../../shared/prefixes.js";
import type {
  ComponentDetailed,
  FilterConfig,
  StandardRef,
  TokenRef,
} from "../../shared/types.js";
import extractLocalName from "../helpers/extractLocalName.js";

export default async function getComponent(
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
        ?component a ${P.ds}Component ;
                   ${P.ds}name ${escaped} ;
                   ${P.ds}tier ?tier .
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

  // Safe: length check above guarantees bindings[0] exists
  const base = baseResult.bindings[0] as (typeof baseResult.bindings)[number];
  const componentUri = base.component;

  // Modifiers with values
  const modResult = await store.query(
    buildQuery(`
      SELECT ?modName ?value
      WHERE {
        <${componentUri}> ${P.ds}hasModifierFamily ?family .
        ?family ${P.ds}name ?modName .
        OPTIONAL {
          ?mod a ${P.ds}Modifier ;
               ${P.ds}modifierFamily ?family ;
               ${P.ds}name ?value .
        }
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
        ?lib ${P.ds}hasImplementation ?impl .
        ?impl ${P.ds}implementsBlock <${componentUri}> ;
              ${P.ds}headLink ?path .
        ?lib ${P.ds}platform ?framework .
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
        <${componentUri}> ${P.ds}usesToken ?token .
        ?token ${P.ds}tokenId ?tokenId .
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

  // Anatomy node count
  const nodeResult = await store.query(
    buildQuery(`
      SELECT (COUNT(DISTINCT ?node) AS ?nodeCount)
      WHERE {
        <${componentUri}> ${P.ds}anatomyNode ?node .
      }
    `),
  );

  const nodeCount =
    nodeResult.type === "select" && nodeResult.bindings.length > 0
      ? Number.parseInt(nodeResult.bindings[0]?.nodeCount ?? "0", 10) || 0
      : 0;

  // Standards (not linked directly to components in current ontology;
  // will be populated via @follows in v0.3)
  const standards: StandardRef[] = [];

  return {
    uri: (componentUri ?? "") as URI,
    name,
    tier: extractLocalName(base.tier ?? ""),
    modifiers: [...modifierMap.keys()],
    implementations,
    nodeCount,
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
 */
async function listAllFrameworks(store: Store): Promise<string[]> {
  const result = await store.query(
    buildQuery(`
      SELECT DISTINCT ?framework
      WHERE {
        ?lib a ${P.ds}ImplementationLibrary ;
             ${P.ds}platform ?framework .
      }
      ORDER BY ?framework
    `),
  );

  if (result.type !== "select") return [];
  return result.bindings.map((b) => b.framework ?? "");
}

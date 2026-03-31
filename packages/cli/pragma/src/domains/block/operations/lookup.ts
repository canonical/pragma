/**
 * Look up detailed information for a single block.
 *
 * Queries the base block, then resolves related modifiers, implementations,
 * tokens, anatomy nodes, blank-node properties, and recursive subcomponents.
 * The result is assembled into a {@link BlockDetailed} object.
 *
 * @param store - ke store to query
 * @param name - block name (e.g. "Button")
 * @param filters - tier and channel filter configuration
 * @returns fully populated block detail
 * @throws PragmaError.notFound if the block does not exist
 * @note Queries ke store
 */

import type { Store, URI } from "@canonical/ke";
import { escapeSparqlValue } from "@canonical/ke";
import { PragmaError } from "#error";
import resolveUri from "../../graph/helpers/resolveUri.js";
import { buildQuery } from "../../shared/buildQuery.js";
import extractLocalName from "../../shared/extractLocalName.js";
import { buildFilters } from "../../shared/filters/buildFilters.js";
import { P } from "../../shared/prefixes.js";
import type {
  BlockDetailed,
  BlockSubcomponent,
  FilterConfig,
  StandardRef,
  TokenRef,
} from "../../shared/types/index.js";

function normalizeBlockType(value: string | undefined): BlockDetailed["type"] {
  const localName = extractLocalName(value ?? "").toLowerCase();

  switch (localName) {
    case "pattern":
    case "layout":
    case "subcomponent":
      return localName;
    default:
      return "component";
  }
}

export default async function lookupBlock(
  store: Store,
  nameOrUri: string,
  filters: FilterConfig,
): Promise<BlockDetailed[]> {
  const filterClauses = buildFilters(filters);
  const subjectClause = buildLookupSubjectClause(nameOrUri, store.prefixes);
  const bindClause =
    subjectClause === null ? "" : `BIND(${subjectClause} AS ?component)`;
  const matchClause =
    subjectClause === null
      ? `?component ${P.ds}name ?name . FILTER(LCASE(STR(?name)) = ${escapeSparqlValue(nameOrUri.toLowerCase())})`
      : "";

  // Base query: find the block(s) — no LIMIT so ambiguous names return all matches
  const baseResult = await store.query(
    buildQuery(`
      SELECT ?component ?name ?type ?tier ?summary ?whenToUse ?whenNotToUse ?guidelines ?anatomyDsl ?anatomyClassic ?figmaLink
      WHERE {
        VALUES ?type { ${P.ds}Component ${P.ds}Pattern ${P.ds}Layout ${P.ds}Subcomponent }
        ${bindClause}
        ?component a ?type ;
                   ${P.ds}name ?name ;
                   ${P.ds}tier ?tier .
        ${matchClause}
        OPTIONAL { ?component ${P.ds}summary ?summary }
        OPTIONAL { ?component ${P.ds}whenToUse ?whenToUse }
        OPTIONAL { ?component ${P.ds}whenNotToUse ?whenNotToUse }
        OPTIONAL { ?component ${P.ds}guidelines ?guidelines }
        OPTIONAL { ?component ${P.ds}anatomyDsl ?anatomyDsl }
        OPTIONAL { ?component ${P.ds}anatomyClassic ?anatomyClassic }
        OPTIONAL { ?component ${P.ds}figmaLink ?figmaLink }
        ${filterClauses}
      }
    `),
  );

  if (baseResult.type !== "select" || baseResult.bindings.length === 0) {
    throw PragmaError.notFound("block", nameOrUri, {
      recovery: {
        message: "List available blocks.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      },
    });
  }

  const results: BlockDetailed[] = [];
  for (const base of baseResult.bindings) {
    results.push(await resolveBlockDetail(store, base, nameOrUri));
  }
  return results;
}

async function resolveBlockDetail(
  store: Store,
  base: Record<string, string>,
  nameOrUri: string,
): Promise<BlockDetailed> {
  const componentUri = base.component;

  // Modifier families with values
  const modResult = await store.query(
    buildQuery(`
      SELECT ?family ?modName ?value
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
  const modifierFamilyUriMap = new Map<string, URI>();
  if (modResult.type === "select") {
    for (const b of modResult.bindings) {
      const existing = modifierMap.get(b.modName ?? "") ?? [];
      if (b.value) {
        existing.push(b.value);
      }
      modifierMap.set(b.modName ?? "", existing);

      if (b.modName && b.family) {
        modifierFamilyUriMap.set(b.modName, b.family as URI);
      }
    }
  }

  const modifierFamilies = [...modifierMap.entries()].map(([name, values]) => ({
    uri: modifierFamilyUriMap.get(name) ?? ("" as URI),
    name,
    values,
  }));

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

  // Anatomy nodes
  const anatomyResult = await store.query(
    buildQuery(`
      SELECT DISTINCT ?node ?name
      WHERE {
        <${componentUri}> ${P.ds}anatomyNode ?node .
        OPTIONAL { ?node ${P.ds}name ?name }
      }
      ORDER BY ?node
    `),
  );

  const anatomyNodes =
    anatomyResult.type === "select"
      ? anatomyResult.bindings.map((binding) => ({
          uri: (binding.node ?? "") as URI,
          name: binding.name,
        }))
      : [];
  const nodeCount = anatomyNodes.length;
  const anatomy = buildAnatomyTree(anatomyNodes);

  // Component properties from blank nodes
  const propertiesResult = await store.query(
    buildQuery(`
      SELECT ?property ?name ?propertyType ?optional ?defaultValue ?constraints
      WHERE {
        <${componentUri}> ${P.ds}hasProperty ?property .
        ?property ${P.ds}name ?name .
        OPTIONAL { ?property ${P.ds}propertyType ?propertyType }
        OPTIONAL { ?property ${P.ds}optional ?optional }
        OPTIONAL { ?property ${P.ds}defaultValue ?defaultValue }
        OPTIONAL { ?property ${P.ds}constraints ?constraints }
      }
      ORDER BY ?name
    `),
  );

  const properties =
    propertiesResult.type === "select"
      ? propertiesResult.bindings.map((binding) => ({
          name: binding.name ?? "",
          propertyType: binding.propertyType ?? "",
          optional: binding.optional === "true",
          defaultValue: binding.defaultValue ?? null,
          constraints: binding.constraints ?? null,
        }))
      : [];

  // Recursive subcomponents
  const subcomponentsResult = await store.query(
    buildQuery(`
      SELECT DISTINCT ?parent ?subcomponent ?name
      WHERE {
        <${componentUri}> (${P.ds}hasSubcomponent|^${P.ds}parentComponent)+ ?subcomponent .
        ?parent (${P.ds}hasSubcomponent|^${P.ds}parentComponent) ?subcomponent .
        ?subcomponent ${P.ds}name ?name .
        FILTER(
          ?parent = <${componentUri}> ||
          EXISTS {
            <${componentUri}> (${P.ds}hasSubcomponent|^${P.ds}parentComponent)+ ?parent
          }
        )
      }
      ORDER BY ?parent ?name
    `),
  );

  const subcomponents =
    subcomponentsResult.type === "select"
      ? buildSubcomponentTree(
          (componentUri ?? "") as URI,
          subcomponentsResult.bindings,
        )
      : [];

  // Standards (not linked directly to blocks in current ontology;
  // will be populated via @follows in v0.3)
  const standards: StandardRef[] = [];

  return {
    uri: (componentUri ?? "") as URI,
    name: base.name ?? nameOrUri,
    type: normalizeBlockType(base.type),
    tier: extractLocalName(base.tier ?? ""),
    modifiers: [...modifierMap.keys()],
    implementations,
    summary: base.summary ?? null,
    nodeCount,
    tokenCount: tokens.length,
    whenToUse: base.whenToUse ?? null,
    whenNotToUse: base.whenNotToUse ?? null,
    guidelines: base.guidelines ?? null,
    anatomyDsl: base.anatomyDsl ?? null,
    anatomyClassic: base.anatomyClassic ?? null,
    figmaLink: base.figmaLink ?? null,
    anatomy,
    modifierValues: [...modifierMap.entries()].map(([family, values]) => ({
      family,
      values,
    })),
    modifierFamilies,
    properties,
    subcomponents,
    implementationPaths,
    tokens,
    standards,
  };
}

function buildLookupSubjectClause(
  query: string,
  prefixes: Readonly<Record<string, string>>,
): string | null {
  if (!looksLikeUri(query)) {
    return null;
  }

  return `<${resolveUri(query, prefixes)}>`;
}

function looksLikeUri(query: string): boolean {
  return (
    query.startsWith("http://") ||
    query.startsWith("https://") ||
    query.includes(":")
  );
}

function buildAnatomyTree(
  nodes: readonly { uri: URI; name?: string }[],
): BlockDetailed["anatomy"] {
  if (nodes.length === 0) {
    return null;
  }

  const sorted = [...nodes].sort(
    (left, right) => scoreAnatomyNode(right) - scoreAnatomyNode(left),
  );
  const [root, ...children] = sorted;
  return {
    root: {
      name: root?.name ?? extractLocalName(root?.uri ?? "node"),
      type: root?.name ? "named" : "anonymous",
      children: children.map((node) => ({
        name: node.name ?? extractLocalName(node.uri),
        type: node.name ? "named" : "anonymous",
        children: [],
      })),
    },
  };
}

function scoreAnatomyNode(node: { uri: URI; name?: string }): number {
  const uri = String(node.uri);
  if (uri.endsWith(".root") || node.name === "button" || node.name === "card") {
    return 2;
  }
  if (node.name) {
    return 1;
  }
  return 0;
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

function buildSubcomponentTree(
  rootUri: URI,
  bindings: readonly Record<string, string>[],
): readonly BlockSubcomponent[] {
  const nodeMap = new Map<string, BlockSubcomponent>();
  const childrenByParent = new Map<string, string[]>();

  for (const binding of bindings) {
    const uri = (binding.subcomponent ?? "") as URI;
    const parent = (binding.parent ?? "") as URI;
    if (!uri || !parent) {
      continue;
    }

    nodeMap.set(String(uri), {
      uri,
      name: binding.name ?? extractLocalName(String(uri)),
      children: [],
    });

    const siblings = childrenByParent.get(String(parent)) ?? [];
    if (!siblings.includes(String(uri))) {
      siblings.push(String(uri));
      childrenByParent.set(String(parent), siblings);
    }
  }

  return buildSubcomponentChildren(String(rootUri), childrenByParent, nodeMap);
}

function buildSubcomponentChildren(
  parentUri: string,
  childrenByParent: ReadonlyMap<string, readonly string[]>,
  nodeMap: ReadonlyMap<string, BlockSubcomponent>,
  visited = new Set<string>(),
): readonly BlockSubcomponent[] {
  const childUris = childrenByParent.get(parentUri) ?? [];

  return childUris.flatMap((childUri) => {
    const node = nodeMap.get(childUri);
    if (!node || visited.has(childUri)) {
      return [];
    }

    const nextVisited = new Set(visited);
    nextVisited.add(childUri);

    return [
      {
        ...node,
        children: buildSubcomponentChildren(
          childUri,
          childrenByParent,
          nodeMap,
          nextVisited,
        ),
      },
    ];
  });
}

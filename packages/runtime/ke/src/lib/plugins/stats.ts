// =============================================================================
// @canonical/ke — Stats plugin
//
// Computes per-class instance counts with rdfs:subClassOf inheritance rollup.
// After all sources are loaded, queries the store for rdf:type and
// rdfs:subClassOf relations, computes direct and total counts per class,
// and injects them as triples into a named graph (urn:ke:stats).
//
// Stats are recomputed on reload.
//
// Usage:
//   import { createStore, sparql } from "@canonical/ke";
//   import { statsPlugin, type StatsApi } from "@canonical/ke/plugins/stats";
//
//   const store = await createStore({
//     sources: ["./ontology.ttl", "./data/*.ttl"],
//     plugins: [statsPlugin()],
//   });
//
//   // Via typed API
//   const stats = store.api<StatsApi>("stats");
//   stats?.getCounts();
//
//   // Via SPARQL
//   await store.query(sparql`
//     SELECT ?class ?total WHERE {
//       GRAPH <urn:ke:stats> { ?class <urn:ke:stats#totalCount> ?total }
//     }
//   `);
// =============================================================================

import definePlugin from "../definePlugin.js";
import { sparql } from "../sparql.js";
import type { PluginContext, SelectResult } from "../types.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Per-class instance count, including inherited instances. */
export interface ClassCount {
  /** The class URI. */
  classUri: string;
  /** Direct instance count (only instances typed exactly as this class). */
  direct: number;
  /** Total instance count (direct + all descendant subclass instances). */
  total: number;
}

/** The API exposed by the stats plugin via `store.api<StatsApi>("stats")`. */
export interface StatsApi {
  /** Get all class counts, sorted by total descending. */
  getCounts(): ClassCount[];
  /** Get the count for a specific class URI. Returns undefined if not found. */
  getCount(classUri: string): ClassCount | undefined;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The named graph where stats triples are stored. */
export const STATS_GRAPH = "urn:ke:stats";

/** Namespace for stats predicates. */
const KE_STATS = "urn:ke:stats#";

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

/**
 * Query the store for rdf:type and rdfs:subClassOf relations, compute
 * direct + inherited instance counts per class, inject as triples into
 * the stats graph, and return a typed StatsApi.
 */
async function computeStats(ctx: PluginContext): Promise<StatsApi> {
  // Step 1: Count direct instances per class
  const typeResult = (await ctx.query(
    sparql`SELECT ?class (COUNT(?instance) AS ?count) WHERE { ?instance a ?class } GROUP BY ?class`,
  )) as SelectResult;

  const directCounts = new Map<string, number>();
  for (const binding of typeResult.bindings) {
    /* v8 ignore start -- defensive ?? for SPARQL binding access; untestable without violating SPARQL contract */
    const cls = binding.class ?? "";
    const count = Number.parseInt(binding.count ?? "0", 10);
    /* v8 ignore stop */
    directCounts.set(cls, count);
  }

  // Step 2: Query the rdfs:subClassOf hierarchy
  const hierarchyResult = (await ctx.query(
    sparql`SELECT ?sub ?super WHERE { ?sub <http://www.w3.org/2000/01/rdf-schema#subClassOf> ?super }`,
  )) as SelectResult;

  // Build children map: parent -> set of children
  const childrenMap = new Map<string, Set<string>>();
  const allClasses = new Set<string>([...directCounts.keys()]);

  for (const binding of hierarchyResult.bindings) {
    /* v8 ignore start -- defensive ?? for SPARQL binding access; untestable without violating SPARQL contract */
    const sub = binding.sub ?? "";
    const sup = binding.super ?? "";
    /* v8 ignore stop */
    allClasses.add(sub);
    allClasses.add(sup);

    let children = childrenMap.get(sup);
    if (!children) {
      children = new Set();
      childrenMap.set(sup, children);
    }
    children.add(sub);
  }

  // Step 3: Compute total counts (direct + all descendant instances)
  // Memoized recursive descent with cycle detection
  const totalCounts = new Map<string, number>();
  const visiting = new Set<string>();

  function computeTotal(cls: string): number {
    const cached = totalCounts.get(cls);
    if (cached !== undefined) return cached;
    if (visiting.has(cls)) return directCounts.get(cls) ?? 0; // cycle — break

    visiting.add(cls);
    let total = directCounts.get(cls) ?? 0;
    const children = childrenMap.get(cls);
    if (children) {
      for (const child of children) {
        total += computeTotal(child);
      }
    }
    visiting.delete(cls);
    totalCounts.set(cls, total);
    return total;
  }

  for (const cls of allClasses) {
    computeTotal(cls);
  }

  // Step 4: Clear the stats graph and inject new triples
  // SILENT suppresses the error if the graph doesn't exist yet
  ctx.update(`DROP SILENT GRAPH <${STATS_GRAPH}>`);

  const triples: string[] = [];
  for (const cls of allClasses) {
    const direct = directCounts.get(cls) ?? 0;
    const total = computeTotal(cls); // already memoized — O(1) lookup
    triples.push(
      `  <${cls}> <${KE_STATS}directCount> ${direct} .`,
      `  <${cls}> <${KE_STATS}totalCount> ${total} .`,
    );
  }

  if (triples.length > 0) {
    ctx.update(`
      INSERT DATA {
        GRAPH <${STATS_GRAPH}> {
${triples.join("\n")}
        }
      }
    `);
  }

  // Step 5: Build and return the typed API
  const countsArray: ClassCount[] = [...allClasses]
    .map((cls) => ({
      classUri: cls,
      direct: directCounts.get(cls) ?? 0,
      total: computeTotal(cls), // already memoized — O(1) lookup
    }))
    .sort((a, b) => b.total - a.total);

  const countsByUri = new Map(countsArray.map((c) => [c.classUri, c]));

  return {
    getCounts: () => countsArray,
    getCount: (uri: string) => countsByUri.get(uri),
  };
}

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

/**
 * Create a stats plugin that computes per-class instance counts with
 * rdfs:subClassOf inheritance rollup.
 *
 * @example
 * ```ts
 * const store = await createStore({
 *   sources: ["./ontology.ttl", "./data/*.ttl"],
 *   plugins: [statsPlugin()],
 * });
 *
 * const stats = store.api<StatsApi>("stats");
 * console.log(stats?.getCounts());
 * ```
 */
export function statsPlugin() {
  return definePlugin<StatsApi>({
    name: "stats",

    async onReady(ctx) {
      return computeStats(ctx);
    },

    async onReload(ctx) {
      return computeStats(ctx);
    },
  });
}

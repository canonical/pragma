/**
 * Pure class-hierarchy builder shared by every `ontology show` projection.
 *
 * The {@link OntologyDetailed} data shape keeps classes as a flat,
 * topologically ordered array with `subClassOf` edges (canonical for JSON
 * and MCP consumers); the plain and llm renderers both derive their tree
 * from this single implementation so the hierarchy can never diverge
 * between output modes.
 */

import type { OntologyClass } from "../../shared/types/index.js";

/** A class positioned in the rendered hierarchy. */
export interface ClassTreeNode {
  readonly cls: OntologyClass;
  readonly children: readonly ClassTreeNode[];
  /**
   * Superclasses beyond the one used for tree placement (multiple
   * inheritance) — renderers annotate these as "also extends".
   */
  readonly alsoExtends: readonly string[];
}

/**
 * Arrange classes into a forest.
 *
 * Roots are classes with no in-set parent; children sort alphabetically by
 * label. A class with several in-set parents is placed under its first
 * (alphabetically sorted) parent and carries the rest in `alsoExtends`.
 * Cycle-safe: an edge that would revisit a placed class is ignored, so a
 * cyclic ontology degrades to a flat listing rather than recursing.
 *
 * @param classes - Flat class array (any order; `subClassOf` holds compact
 *   or full IRIs — matching whatever `iri` uses).
 * @returns Root nodes in alphabetical label order.
 */
export default function buildClassTree(
  classes: readonly OntologyClass[],
): ClassTreeNode[] {
  const byIri = new Map(classes.map((c) => [c.iri, c]));
  const placed = new Set<string>();

  const inSetParents = (cls: OntologyClass): string[] =>
    cls.subClassOf.filter((parent) => byIri.has(parent));

  const childrenOf = (parentIri: string): OntologyClass[] =>
    classes
      .filter((c) => inSetParents(c)[0] === parentIri)
      .sort((a, b) => a.label.localeCompare(b.label));

  const build = (cls: OntologyClass): ClassTreeNode => {
    placed.add(cls.iri);
    const parents = inSetParents(cls);
    return {
      cls,
      alsoExtends: parents.slice(1),
      children: childrenOf(cls.iri)
        .filter((child) => !placed.has(child.iri))
        .map(build),
    };
  };

  const roots = classes
    .filter((c) => inSetParents(c).length === 0)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(build);

  // Cycle fallback: anything unreachable from a root (e.g. mutually
  // extending classes) is appended as an additional root.
  const leftovers = classes
    .filter((c) => !placed.has(c.iri))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(build);

  return [...roots, ...leftovers];
}

/** Flatten a forest to pre-order (the shape's canonical class ordering). */
export function flattenClassTree(
  nodes: readonly ClassTreeNode[],
): OntologyClass[] {
  const out: OntologyClass[] = [];
  const walk = (node: ClassTreeNode): void => {
    out.push(node.cls);
    for (const child of node.children) walk(child);
  };
  for (const node of nodes) walk(node);
  return out;
}

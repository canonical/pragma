/**
 * The hierarchy well's DETERMINISTIC layout: ontology class lists in, a
 * fully-positioned React Flow node/edge model out. Pure — same input,
 * byte-equal output (`buildClassTree.tests.ts` pins it) — because the
 * positions must be computed identically on the server and the client:
 * React Flow v12 renders the full node DOM during SSR only when every node
 * carries explicit `width`/`height` (and `handles`, for server-rendered
 * edge paths), so any nondeterminism here would surface as a hydration
 * mismatch, which the hydration suite gates.
 *
 * Layout model: each ontology is a block of layers, ontologies side by
 * side in query order. Within an ontology, a class's layer is its
 * superclass depth (roots at the top, y grows downward); within a layer,
 * classes keep the graph's own stable order. Edges run subclass → its
 * superclass (upward), one per class that names a superclass present in
 * the same ontology's list.
 */

import { Position } from "@xyflow/react";
import { type OntologyNamespace, toPrefixedUri } from "../uris.js";
import type { TermFlowEdge, TermFlowNode } from "./types.js";

/** One ontology's classes, as the `HierarchyWell_ontologies` fragment
 * delivers them (readonly shapes so fragment data plugs in directly). */
export interface ClassTreeOntology extends OntologyNamespace {
  readonly classes: readonly {
    readonly uri: string;
    readonly label: string | null | undefined;
    readonly isAbstract: boolean;
    readonly superclass: { readonly uri: string } | null | undefined;
  }[];
}

/** The positioned graph: React Flow's inputs, deterministic. */
export interface ClassTree {
  readonly nodes: readonly TermFlowNode[];
  readonly edges: readonly TermFlowEdge[];
}

/** Explicit node metrics — the SSR contract (see module doc). */
export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 40;
/** Gaps: columns within a layer, rows between layers, between ontologies. */
export const COLUMN_GAP = 24;
export const ROW_GAP = 56;
export const ONTOLOGY_GAP = 96;

/**
 * A class's superclass depth within its ontology: 0 for roots (no
 * superclass, or one not in this ontology's list). Cycles — schema-illegal
 * but defended — terminate at the walk's length bound.
 */
const superclassDepth = (
  uri: string,
  superclassByUri: ReadonlyMap<string, string | undefined>,
): number => {
  let depth = 0;
  let current = superclassByUri.get(uri);
  while (current !== undefined && depth < superclassByUri.size) {
    if (!superclassByUri.has(current)) break;
    depth += 1;
    current = superclassByUri.get(current);
  }
  return depth;
};

/**
 * Build the positioned class graph for the given ontologies. Node ids are
 * PREFIXED term URIs — the same strings the term route addresses — so
 * selection highlighting and node links need no further translation.
 */
export const buildClassTree = (
  ontologies: readonly ClassTreeOntology[],
): ClassTree => {
  const nodes: TermFlowNode[] = [];
  const edges: TermFlowEdge[] = [];
  let ontologyOffsetX = 0;

  for (const ontology of ontologies) {
    const namespaces = [ontology];
    const superclassByUri = new Map<string, string | undefined>(
      ontology.classes.map((klass) => [klass.uri, klass.superclass?.uri]),
    );

    // Layer per depth, preserving the graph's own class order within each.
    const layers = new Map<number, ClassTreeOntology["classes"][number][]>();
    for (const klass of ontology.classes) {
      const depth = superclassDepth(klass.uri, superclassByUri);
      const layer = layers.get(depth) ?? [];
      layer.push(klass);
      layers.set(depth, layer);
    }

    let widestLayer = 0;
    for (const [depth, layer] of [...layers.entries()].sort(
      ([a], [b]) => a - b,
    )) {
      widestLayer = Math.max(widestLayer, layer.length);
      for (const [column, klass] of layer.entries()) {
        const prefixed = toPrefixedUri(klass.uri, namespaces);
        nodes.push({
          id: prefixed,
          type: "term",
          position: {
            x: ontologyOffsetX + column * (NODE_WIDTH + COLUMN_GAP),
            y: depth * (NODE_HEIGHT + ROW_GAP),
          },
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          // Both handles ride every node with node-relative coordinates,
          // so edge paths are computable server-side: a subclass edge
          // leaves the child's top centre and lands on the parent's
          // bottom centre (parents sit a layer above).
          handles: [
            {
              type: "source",
              position: Position.Top,
              x: NODE_WIDTH / 2,
              y: 0,
            },
            {
              type: "target",
              position: Position.Bottom,
              x: NODE_WIDTH / 2,
              y: NODE_HEIGHT,
            },
          ],
          draggable: false,
          connectable: false,
          data: {
            term: prefixed,
            label: klass.label ?? prefixed,
            isAbstract: klass.isAbstract,
            prefix: ontology.prefix,
          },
        });
        const superclassUri = klass.superclass?.uri;
        if (superclassUri !== undefined && superclassByUri.has(superclassUri)) {
          const parentPrefixed = toPrefixedUri(superclassUri, namespaces);
          edges.push({
            id: `${prefixed}=>${parentPrefixed}`,
            source: prefixed,
            target: parentPrefixed,
            type: "smoothstep",
          });
        }
      }
    }

    const ontologyWidth =
      widestLayer > 0
        ? widestLayer * (NODE_WIDTH + COLUMN_GAP) - COLUMN_GAP
        : 0;
    ontologyOffsetX += ontologyWidth + ONTOLOGY_GAP;
  }

  return { nodes, edges };
};

/**
 * The definitions well's DETERMINISTIC layout — the well grammar
 * (AV-364) replacing the retired layer-grid: RADIAL CLUSTERS instead of
 * an organigram. Pure — same input, byte-equal output
 * (`buildClassGraph.tests.ts` pins it) — because positions are computed
 * identically on the server and the client; the SSR/hydration suite
 * gates any drift.
 *
 * Layout model, per ontology: a radial tree. Depth from the root is the
 * RADIUS (meaning on the radial axis — the old layer semantics survive as
 * concentric rings), and each subtree claims an angular window
 * proportional to its leaf count (classic tidy-radial, deterministic).
 * The shared relaxation pass then separates any boxes that still collide
 * — physics on the angular axis. A 17-class ontology settles into a
 * compact disc instead of a 1,500px-wide comb, which is what fixes the
 * old well's horizontal overflow at the root.
 *
 * Clusters pack left-to-right, wrapping into rows against a target
 * width, in query order — stable, and the wrap keeps the whole canvas
 * near the golden-ish aspect the explorer's underground actually has.
 *
 * Edges carry the TWO families the exhibit drew and the old well lost:
 * subclass → superclass stays a quiet STRUCTURAL line; object properties
 * (domain → range, both classes present) become SEMANTIC arcs wearing
 * their predicate — the addition that turns the tree back into an
 * ontology. Parallel arcs stack their bows; a self-referential property
 * (`cs:extends`) draws as a loop.
 */

import {
  edgeEndpoint,
  quadArc,
  relaxBoxes,
  selfLoop,
  settle,
  type WellBox,
} from "#lib/WellGeometry/index.js";
import { type OntologyNamespace, toPrefixedUri } from "../uris.js";
import type { ClusterExtent, TermFlowEdge, TermFlowNode } from "./types.js";

/** One ontology as the `HierarchyWell_ontologies` fragment delivers it
 * (readonly shapes so fragment data plugs in directly). */
export interface ClassGraphOntology extends OntologyNamespace {
  readonly classes: readonly {
    readonly uri: string;
    readonly label: string | null | undefined;
    readonly isAbstract: boolean;
    readonly superclass: { readonly uri: string } | null | undefined;
  }[];
  readonly properties: readonly {
    readonly uri: string;
    readonly label: string | null | undefined;
    readonly kind: string;
    readonly domain: { readonly uri: string } | null | undefined;
    readonly range: string;
  }[];
}

/** The settled graph plus canvas extent and the initial camera scale. */
export interface ClassGraph {
  readonly nodes: readonly TermFlowNode[];
  readonly edges: readonly TermFlowEdge[];
  readonly clusters: readonly ClusterExtent[];
  readonly width: number;
  readonly height: number;
  /** Deterministic initial zoom: fits a typical canvas, clamped sane. */
  readonly fitScale: number;
}

/* Geometry constants — content-estimated boxes, never measured (SSR). */
export const NODE_CHAR_WIDTH = 7.2;
export const NODE_PADDING = 30;
export const NODE_MIN_WIDTH = 60;
export const NODE_MAX_WIDTH = 210;
export const NODE_HEIGHT = 32;
/** Ring spacing per depth step: wide x, shallower y (label-shaped). */
export const RING_X = 200;
export const RING_Y = 105;
export const RELAX_ITERATIONS = 80;
export const COLLISION_GAP = 14;
export const CLUSTER_GAP = 120;
export const CANVAS_PADDING = 48;
/** Clusters wrap into a new row past this cumulative width. */
export const TARGET_ROW_WIDTH = 1700;
export const EDGE_BOW = 34;
/** The width the initial camera aims to show whole. */
export const FIT_VIEW_WIDTH = 1150;

const estimateWidth = (label: string): number =>
  Math.min(
    Math.max(
      Math.round(label.length * NODE_CHAR_WIDTH) + NODE_PADDING,
      NODE_MIN_WIDTH,
    ),
    NODE_MAX_WIDTH,
  );

/**
 * A class's superclass depth within its ontology: 0 for roots (no
 * superclass, or one not in this ontology's list). Cycles — schema-illegal
 * but defended — terminate at the walk's length bound.
 */
export const superclassDepth = (
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

/** One class's addressing-and-hierarchy identity, the minimum the depth
 * walk needs (a subset of the well's fragment shape). */
export interface DepthClass {
  readonly uri: string;
  readonly superclass?: { readonly uri: string } | null | undefined;
}

/**
 * The superclass depth of every class in ONE ontology, keyed by full URI
 * — shared with the rail so the index indents by the identical measure
 * the well ringifies by (M-STRUCT: one source of truth for depth).
 */
export const classDepthsByUri = (
  classes: readonly DepthClass[],
): ReadonlyMap<string, number> => {
  const superclassByUri = new Map<string, string | undefined>(
    classes.map((klass) => [klass.uri, klass.superclass?.uri]),
  );
  return new Map(
    classes.map((klass) => [
      klass.uri,
      superclassDepth(klass.uri, superclassByUri),
    ]),
  );
};

interface WorkingNode extends WellBox {
  readonly id: string;
  readonly data: TermFlowNode["data"];
}

/**
 * One ontology's radial cluster, centred at (0,0): subtree angular
 * windows proportional to leaf counts, radius = depth. Multiple roots
 * share the disc as siblings of a virtual centre (and sit at radius 1 so
 * none of them squats the middle pretending to be THE root).
 */
const layoutCluster = (ontology: ClassGraphOntology): WorkingNode[] => {
  const namespaces = [ontology];
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];
  const classByUri = new Map(
    ontology.classes.map((klass) => [klass.uri, klass]),
  );
  for (const klass of ontology.classes) {
    const parent = klass.superclass?.uri;
    if (parent !== undefined && classByUri.has(parent)) {
      const siblings = childrenOf.get(parent) ?? [];
      siblings.push(klass.uri);
      childrenOf.set(parent, siblings);
    } else {
      roots.push(klass.uri);
    }
  }

  const leafCount = (uri: string): number => {
    const children = childrenOf.get(uri) ?? [];
    if (children.length === 0) return 1;
    let total = 0;
    for (const child of children) total += leafCount(child);
    return total;
  };

  const nodes: WorkingNode[] = [];
  const singleRoot = roots.length === 1;
  const depthByUri = classDepthsByUri(ontology.classes);

  const place = (uri: string, from: number, to: number): void => {
    const klass = classByUri.get(uri);
    if (klass === undefined) return;
    const depth = depthByUri.get(uri) ?? 0;
    // Radius: the lone root owns the centre; in a multi-root disc every
    // root starts one ring out, keeping the middle clear.
    const ring = singleRoot ? depth : depth + 1;
    const angle = (from + to) / 2 - Math.PI / 2;
    const radiusX = singleRoot && depth === 0 ? 0 : ring * RING_X;
    const radiusY = singleRoot && depth === 0 ? 0 : ring * RING_Y;
    const label = klass.label ?? toPrefixedUri(klass.uri, namespaces);
    nodes.push({
      id: toPrefixedUri(klass.uri, namespaces),
      data: {
        term: toPrefixedUri(klass.uri, namespaces),
        label,
        isAbstract: klass.isAbstract,
        prefix: ontology.prefix,
      },
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY,
      width: estimateWidth(label),
      height: NODE_HEIGHT,
    });
    const children = childrenOf.get(uri) ?? [];
    const total = children.reduce((sum, child) => sum + leafCount(child), 0);
    let cursor = from;
    for (const child of children) {
      const share = ((to - from) * leafCount(child)) / Math.max(total, 1);
      place(child, cursor, cursor + share);
      cursor += share;
    }
  };

  const totalLeaves = roots.reduce((sum, root) => sum + leafCount(root), 0);
  let cursor = 0;
  for (const root of roots) {
    const share = (2 * Math.PI * leafCount(root)) / Math.max(totalLeaves, 1);
    place(root, cursor, cursor + share);
    cursor += share;
  }

  relaxBoxes(nodes, {
    gap: COLLISION_GAP,
    iterations: RELAX_ITERATIONS,
    pinned: singleRoot ? new Set([0]) : undefined,
  });
  return nodes;
};

/**
 * Builds the settled multi-ontology graph: clusters laid out at the
 * origin, packed into wrapping rows, then normalised to a padded
 * top-left origin. Node ids are PREFIXED term URIs throughout.
 */
export const buildClassGraph = (
  ontologies: readonly ClassGraphOntology[],
): ClassGraph => {
  interface Cluster {
    readonly ontology: ClassGraphOntology;
    readonly nodes: WorkingNode[];
    readonly width: number;
    readonly height: number;
  }

  const clusters: Cluster[] = ontologies
    .filter((ontology) => ontology.classes.length > 0)
    .map((ontology) => {
      const nodes = layoutCluster(ontology);
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const node of nodes) {
        minX = Math.min(minX, node.x - node.width / 2);
        minY = Math.min(minY, node.y - node.height / 2);
        maxX = Math.max(maxX, node.x + node.width / 2);
        maxY = Math.max(maxY, node.y + node.height / 2);
      }
      // Rebase each cluster to its own top-left origin.
      for (const node of nodes) {
        node.x -= minX;
        node.y -= minY;
      }
      return {
        ontology,
        nodes,
        width: maxX - minX,
        height: maxY - minY,
      };
    });

  // Pack clusters into wrapping rows, query order (stable).
  const extents: ClusterExtent[] = [];
  let rowX = 0;
  let rowY = 0;
  let rowHeight = 0;
  for (const cluster of clusters) {
    if (rowX > 0 && rowX + cluster.width > TARGET_ROW_WIDTH) {
      rowY += rowHeight + CLUSTER_GAP;
      rowX = 0;
      rowHeight = 0;
    }
    for (const node of cluster.nodes) {
      node.x += rowX + CANVAS_PADDING;
      node.y += rowY + CANVAS_PADDING;
    }
    extents.push({
      prefix: cluster.ontology.prefix,
      x: settle(rowX + CANVAS_PADDING),
      y: settle(rowY + CANVAS_PADDING),
      width: settle(cluster.width),
      height: settle(cluster.height),
    });
    rowX += cluster.width + CLUSTER_GAP;
    rowHeight = Math.max(rowHeight, cluster.height);
  }

  const nodes: TermFlowNode[] = clusters
    .flatMap((cluster) => cluster.nodes)
    .map((node) => ({
      id: node.id,
      data: node.data,
      x: settle(node.x),
      y: settle(node.y),
      width: node.width,
      height: node.height,
    }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  // Full IRI → prefixed id, across EVERY ontology's namespace (a
  // property's range may cross ontologies).
  const allNamespaces: OntologyNamespace[] = ontologies.map(
    ({ prefix, namespace }) => ({ prefix, namespace }),
  );

  const edges: TermFlowEdge[] = [];
  // Structural: subclass → superclass, straight, unlabelled.
  for (const ontology of ontologies) {
    const namespaces = [ontology];
    for (const klass of ontology.classes) {
      const parentUri = klass.superclass?.uri;
      if (parentUri === undefined) continue;
      const child = nodeById.get(toPrefixedUri(klass.uri, namespaces));
      const parent = nodeById.get(toPrefixedUri(parentUri, namespaces));
      if (child === undefined || parent === undefined) continue;
      const start = edgeEndpoint(child, parent, 2);
      const end = edgeEndpoint(parent, child, 6);
      edges.push({
        id: `sub:${child.id}`,
        source: child.id,
        target: parent.id,
        family: "structural",
        d: `M ${settle(start.x)} ${settle(start.y)} L ${settle(end.x)} ${settle(end.y)}`,
      });
    }
  }
  // Semantic: object properties whose domain AND range are drawn classes.
  // Parallel arcs (do/don't) stack their bows; self-references loop.
  const parallelCount = new Map<string, number>();
  for (const ontology of ontologies) {
    for (const property of ontology.properties) {
      if (property.kind !== "OBJECT") continue;
      const domainUri = property.domain?.uri;
      if (domainUri === undefined) continue;
      const source = nodeById.get(toPrefixedUri(domainUri, allNamespaces));
      const target = nodeById.get(toPrefixedUri(property.range, allNamespaces));
      if (source === undefined || target === undefined) continue;
      const predicate =
        property.label ?? toPrefixedUri(property.uri, allNamespaces);
      const pairKey = `${source.id}=>${target.id}`;
      const rank = parallelCount.get(pairKey) ?? 0;
      parallelCount.set(pairKey, rank + 1);
      const arc =
        source === target
          ? selfLoop(source)
          : quadArc(
              edgeEndpoint(source, target, 3),
              edgeEndpoint(target, source, 7),
              EDGE_BOW * (1 + rank * 0.7),
            );
      edges.push({
        id: `rel:${toPrefixedUri(property.uri, allNamespaces)}`,
        source: source.id,
        target: target.id,
        family: "semantic",
        predicate,
        d: arc.d,
        labelAt: arc.labelAt,
      });
    }
  }

  const width = settle(
    Math.max(...nodes.map((node) => node.x + node.width / 2), 0) +
      CANVAS_PADDING,
  );
  const height = settle(
    Math.max(...nodes.map((node) => node.y + node.height / 2), 0) +
      CANVAS_PADDING,
  );
  const fitScale = settle(
    Math.min(Math.max(FIT_VIEW_WIDTH / Math.max(width, 1), 0.35), 1),
  );
  return { nodes, edges, clusters: extents, width, height, fitScale };
};

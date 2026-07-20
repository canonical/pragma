/**
 * The well's presentation layer: a PURE projection from (graph, selection,
 * focus, filter) to the `className` React Flow paints with. Nothing here
 * measures, mutates or re-lays-out — positions come from `buildClassTree`
 * and are never touched, because the exhibit's one habit we deliberately
 * do NOT copy is re-running physics on every filter change. We dim; we
 * never move.
 *
 * THE SSR SPLIT — the rule this module exists to make legible:
 *
 * - `decorateForSelection` takes ONLY the selected term, which comes from
 *   the URL and is therefore identical on the server and the client. It is
 *   safe to server-render, and it IS server-rendered: the well boots with
 *   the selection's ego-fade already painted, exactly as the exhibit boots
 *   with a selection. Being pure and URL-derived is the whole argument.
 *
 * - `decorateForView` layers the CLIENT-ONLY state (hover/focus, filter)
 *   on top. It is safe only because its neutral input — no hover, no
 *   focus, the no-op filter — provably reproduces `decorateForSelection`'s
 *   output byte for byte (`decorateGraph.tests.ts` pins exactly that), so
 *   the client's first paint matches the server's markup.
 *
 * THE EGO-FADE is one hop, never transitive: a node survives undimmed if
 * it IS the focus or shares an edge with it. Edges fade harder than nodes
 * (the CSS owns the actual opacities), so what survives around a selection
 * is its connective tissue rather than a uniform grey.
 */

import type { LensFilter } from "../lensFilter.js";
import { matchesChips } from "../lensFilter.js";
import type { TermFlowEdge, TermFlowNode } from "./types.js";

/** The class names this module emits — the CSS contract, in one place. */
export const NODE_SELECTED_CLASS = "is-selected";
export const NODE_FADED_CLASS = "is-faded";
export const EDGE_FADED_CLASS = "is-faded";
/** Filtered-OUT graph elements: the graph hides where the rail dims. */
export const HIDDEN_CLASS = "is-hidden";

/** A decorated graph, ready for React Flow. */
export interface DecoratedGraph {
  readonly nodes: readonly TermFlowNode[];
  readonly edges: readonly TermFlowEdge[];
}

/**
 * The one-hop neighbourhood of `focus`: the focus itself plus every node
 * sharing an edge with it. Returns an empty set when nothing is focused,
 * which callers read as "fade nothing".
 */
export const egoNeighbourhood = (
  edges: readonly TermFlowEdge[],
  focus: string | undefined,
): ReadonlySet<string> => {
  if (focus === undefined) return new Set();
  const near = new Set<string>([focus]);
  for (const edge of edges) {
    if (edge.source === focus) near.add(edge.target);
    if (edge.target === focus) near.add(edge.source);
  }
  return near;
};

/** Join class names, dropping empties, so `className` is stable and tidy. */
const joinClasses = (
  ...names: readonly (string | false)[]
): string | undefined => {
  const kept = names.filter((name): name is string => name !== false);
  return kept.length === 0 ? undefined : kept.join(" ");
};

/**
 * Everything the well's appearance depends on, in one argument — so the
 * server call site and the client call site are visibly the same function
 * with different inputs, not two code paths.
 */
export interface DecorateInput {
  /** The URL's selected term. Server-safe. */
  readonly selected: string | undefined;
  /**
   * The transiently focused term — hover OR keyboard focus. Client-only;
   * MUST be undefined on the server and on the first client render.
   */
  readonly focused?: string | undefined;
  /**
   * The chip filter. Client-only in effect; MUST be the no-op seed on the
   * first client render (see `DefinitionsExplorer`).
   */
  readonly filter?: LensFilter | undefined;
}

/**
 * The full projection. `focused` overrides `selected` as the ego centre
 * while it lasts — hover is a transient peek — and clearing it restores
 * the selection's own fade, which is why the selected node keeps its
 * styling when the pointer leaves.
 *
 * Filtering HIDES: a node whose facets fail the chips takes
 * `HIDDEN_CLASS`, and an edge survives only when BOTH its endpoints do
 * (the exhibit's rule). Hidden elements keep their positions, so nothing
 * re-flows when a chip comes back on.
 */
export const decorateForView = (
  graph: DecoratedGraph,
  { selected, focused, filter }: DecorateInput,
): DecoratedGraph => {
  const visible = new Set(
    graph.nodes
      .filter(
        (node) =>
          filter === undefined ||
          matchesChips(filter, node.data.isAbstract, node.data.prefix),
      )
      .map((node) => node.id),
  );

  // The ego centre: the transient focus if there is one, else the URL's
  // selection. A centre that is currently hidden fades nothing — an
  // invisible node has no visible neighbourhood to privilege.
  const centre = focused ?? selected;
  const egoCentre =
    centre !== undefined && visible.has(centre) ? centre : undefined;
  const near = egoNeighbourhood(graph.edges, egoCentre);
  const fading = egoCentre !== undefined;

  const nodes = graph.nodes.map((node) => {
    const hidden = !visible.has(node.id);
    const className = joinClasses(
      node.id === selected && NODE_SELECTED_CLASS,
      hidden && HIDDEN_CLASS,
      !hidden && fading && !near.has(node.id) && NODE_FADED_CLASS,
    );
    // Only rebuild the node when something actually changed: React Flow
    // diffs by identity, and a fresh object per render would repaint the
    // whole graph on every pointer move.
    return node.className === className ? node : { ...node, className };
  });

  const edges = graph.edges.map((edge) => {
    const hidden = !visible.has(edge.source) || !visible.has(edge.target);
    const incident =
      egoCentre !== undefined &&
      (edge.source === egoCentre || edge.target === egoCentre);
    const className = joinClasses(
      hidden && HIDDEN_CLASS,
      !hidden && fading && !incident && EDGE_FADED_CLASS,
    );
    return edge.className === className ? edge : { ...edge, className };
  });

  return { nodes, edges };
};

/**
 * The SERVER-SAFE projection: selection only. Defined in terms of
 * `decorateForView` with the client-only inputs omitted, so the two can
 * never drift — the equality the tests assert is true by construction,
 * and the tests still check it, because "by construction" is a claim that
 * should be falsifiable.
 */
export const decorateForSelection = (
  graph: DecoratedGraph,
  selected: string | undefined,
): DecoratedGraph => decorateForView(graph, { selected });

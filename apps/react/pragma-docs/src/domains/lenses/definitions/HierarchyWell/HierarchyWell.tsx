import { Link } from "@canonical/router-react";
import { Handle, type NodeProps, Position, ReactFlow } from "@xyflow/react";
import type React from "react";
import { memo, useCallback, useMemo } from "react";
import { graphql, useFragment } from "react-relay";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import hierarchyWellFragmentNode from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import { buildClassTree } from "./buildClassTree.js";
import { decorateForView } from "./decorateGraph.js";
import type { HierarchyWellProps, TermFlowNode } from "./types.js";
import WellLegend from "./WellLegend.js";
import "@xyflow/react/dist/style.css";
import "./styles.css";

/**
 * Codegen source of truth for `HierarchyWell_ontologies` (see the
 * components lens's `EntityHeader` for the native-import rationale).
 * `namespace` rides along because the graph returns FULL IRIs and the
 * well's node ids are prefixed term addresses (see `uris.ts`). Never
 * invoked.
 */
const hierarchyWellFragmentSource = (): unknown => graphql`
  fragment HierarchyWell_ontologies on Ontology @relay(plural: true) {
    prefix
    namespace
    classes {
      uri
      label
      isAbstract
      superclass {
        uri
      }
    }
  }
`;
void hierarchyWellFragmentSource;

const componentCssClassName = "ds hierarchy-well";

/**
 * A class node: a real term link, so the graph's nodes are anchors — they
 * SSR as content, hover-prefetch their term, and navigate through the
 * router (URL state, never component state). Selection is the address:
 * the router's `Link` stamps `aria-current="page"` on the current term's
 * node, which the stylesheet raises.
 *
 * Abstract classes are marked the way the exhibit marks them: the label
 * goes italic (the stylesheet's job) and a small ABSTRACT tag rides
 * underneath — real text, so the distinction survives with styling off
 * rather than living in colour alone. The tag sits OUTSIDE the anchor,
 * exactly as the rail's "abstract" note does: a node's accessible name
 * must be the term itself, never the term plus its decoration.
 *
 * The label is `title`-attributed as well as rendered: node geometry is
 * fixed for SSR determinism (no text measurement is available on the
 * server), so a long class name ellipsises and the tooltip is how the
 * full name stays recoverable.
 */
const TermNode = ({ data }: NodeProps<TermFlowNode>): React.ReactElement => (
  <div className="hierarchy-node-shell">
    {/* The handle DOM the edges anchor to. React Flow v12 renders NO handle
        elements for a non-connectable node, and on the client it re-measures
        handle positions FROM the DOM — so without these, every edge loses its
        anchor after hydration and vanishes (the SSR HTML has the edges, the
        client drops them: the "disconnected boxes" bug). Rendering the
        handles explicitly — non-connectable, visually hidden by the well's
        CSS (.react-flow__handle { opacity:0; pointer-events:none }) — gives
        the client real handle geometry to re-anchor to. Their positions MIRROR
        buildClassTree's `handles`: source at the top (a subclass edge leaves
        the child's top), target at the bottom (it lands on the parent's
        bottom). Not interaction points — edge anchors only. */}
    <Handle isConnectable={false} position={Position.Top} type="source" />
    <Handle isConnectable={false} position={Position.Bottom} type="target" />
    <Link
      className={[
        "hierarchy-node",
        data.isAbstract ? "hierarchy-node-abstract" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      params={{ term: data.term }}
      title={data.label}
      to="definitionsTerm"
    >
      {data.label}
    </Link>
    {data.isAbstract ? (
      <span className="hierarchy-node-tag">abstract</span>
    ) : null}
  </div>
);

/** Module-scope node-type map — a stable identity, as React Flow requires. */
const nodeTypes = { term: TermNode };

/**
 * The initial camera: a deterministic constant (never a measured fit), so
 * the server and the client render the same transform and hydration has
 * nothing to reconcile. The graph is wider than most canvases at zoom 1;
 * 0.5 shows the ds block whole on a typical well, and the flow pans/zooms
 * from there.
 */
const DEFAULT_VIEWPORT = { x: 24, y: 24, zoom: 0.5 };

/**
 * The explorer's centre panel: the class graph in the shell's underground
 * well (the `.underground` hook — the depression you look INTO, AX.3).
 * Rendered with React Flow v12, whose SSR path renders the full node DOM
 * server-side because every node carries explicit `width`/`height` and
 * `handles` from the deterministic layout (`buildClassTree`).
 *
 * THE ASYMMETRY: this graph HIDES what the filter excludes (and drops any
 * edge that loses an endpoint), where the rail merely dims. Hiding is by
 * `className` only — positions never change, so a chip toggling back on
 * restores the picture exactly rather than re-running a layout.
 *
 * THE EGO-FADE, one hop and never transitive, is bound to hover AND to
 * FOCUS. The exhibit binds hover alone, which leaves the keyboard without
 * an equivalent; our nodes are real links, so focus is available and the
 * fade follows keyboard traversal exactly as it follows the pointer.
 *
 * The ego centre is no longer well-LOCAL. It is the SHARED `hoverCentre`
 * that `DefinitionsExplorer` owns, so a graph hover and a rail hover write
 * the one value and both surfaces read it — true bidirectional sync. This
 * component's job shrank to: report which node the pointer/keyboard touched
 * (`onHoverTerm`), and fade to whatever centre it is handed.
 *
 * Hover/focus state is CLIENT-ONLY and starts empty (the explorer seeds it
 * `undefined`), so the first client render reproduces the server's
 * selection-only markup byte for byte — see `decorateGraph.ts` for the
 * argument and the test that pins it.
 *
 * Accessibility posture: the well carries an accessible name, and every
 * node is a real link — but the COMPLETE keyboard path through the
 * explorer is the TermRail, which lists every term this graph draws (and
 * the properties besides); the well is a spatial view over the same
 * nouns, never the only route to any of them.
 *
 * Containment: nothing inside the flow uses `position: fixed` (verified
 * against `@xyflow/react`'s stylesheets) — the canvas's `container-type`
 * makes it the containing block for fixed descendants (INTRINSIC-GRID.md
 * entry 5), so a fixed element here would silently anchor to the wrong
 * box. Controls/minimap are simply not rendered in v1.
 */
const HierarchyWell = ({
  className,
  filter,
  ontologies,
  term,
  hoverCentre,
  onHoverTerm,
}: HierarchyWellProps): React.ReactElement => {
  const data = useFragment<HierarchyWell_ontologies$key>(
    hierarchyWellFragmentNode,
    ontologies,
  );
  const graph = useMemo(() => buildClassTree(data), [data]);

  // The transient ego centre is the SHARED one, handed down as a prop:
  // hover or keyboard focus on the graph OR the rail, whichever spoke last.
  // Client-only, and `undefined` on first paint by construction.
  const focused = hoverCentre;

  // The graph answers ONLY to the chip axes. Text is rail-only by
  // contract, so it is destructured out of the memo's dependencies
  // entirely: typing in the search box must not re-decorate 29 nodes and
  // 18 edges on every keystroke, and — more importantly — must not be able
  // to change the graph even by accident. `abstractions` and `namespaces`
  // are stable arrays from the filter, so the memo only recomputes when a
  // chip actually moves.
  const { abstractions, namespaces } = filter;
  const { nodes, edges } = useMemo(
    () =>
      decorateForView(graph, {
        selected: term,
        focused,
        filter: { text: "", abstractions, namespaces },
      }),
    [graph, term, focused, abstractions, namespaces],
  );

  // React Flow offers node-level POINTER callbacks but none for focus, so
  // focus/blur ride the FLOW's own wrapper (both bubble in React) and
  // resolve the node id from the DOM. One code path, two input
  // modalities. They sit on the flow rather than the outer well because
  // the flow element is the labelled, role-bearing region — the well is a
  // plain presentational box, and hanging interaction on it would be
  // exactly the static-element-interaction smell.
  const readTermFromEvent = useCallback(
    (target: EventTarget | null): string | undefined => {
      if (!(target instanceof Element)) return undefined;
      return target.closest<HTMLElement>("[data-id]")?.dataset.id;
    },
    [],
  );

  return (
    <div
      className={[componentCssClassName, "underground", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="explorer-canvas"
    >
      <ReactFlow
        aria-label="Class hierarchy"
        defaultViewport={DEFAULT_VIEWPORT}
        edges={[...edges]}
        elementsSelectable={false}
        maxZoom={2}
        minZoom={0.2}
        nodes={[...nodes]}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
        onBlur={() => {
          onHoverTerm(undefined);
        }}
        onFocus={(event) => {
          onHoverTerm(readTermFromEvent(event.target));
        }}
        onNodeMouseEnter={(_event, node) => {
          onHoverTerm(node.id);
        }}
        onNodeMouseLeave={() => {
          onHoverTerm(undefined);
        }}
      />
      {/* Canvas-local furniture: the two things that genuinely hover over
          the graph in the exhibit. Both are static, so they cost the
          hydration argument nothing. */}
      <p className="hierarchy-furniture hierarchy-hint">
        Drag to pan · scroll to zoom · select a class to inspect it
      </p>
      <WellLegend />
    </div>
  );
};

/**
 * Memoised at the boundary: the explorer re-renders on every keystroke in
 * the search box (the shared filter's `text` changes), but the WELL does
 * not answer to text. Without this, typing would re-render React Flow's
 * whole 29-node tree per character — measurably slow, and pure waste,
 * since the resulting graph is identical.
 *
 * since the resulting graph is identical.
 *
 * The graph answers to: the fragment ref, the selected term, the CHIP
 * axes, and now the shared `hoverCentre` (which re-centres the ego-fade —
 * a rail hover MUST reach the graph). It ignores the filter's TEXT
 * (rail-only) and `onHoverTerm` (a stable callback the explorer memoises;
 * comparing it would defeat the memo on every render). So the comparator
 * re-renders on exactly the inputs the decoration reads — and pinning
 * `hoverCentre` here is what lets a rail hover fade the graph at all.
 */
export default memo(HierarchyWell, (previous, next) => {
  if (
    previous.ontologies !== next.ontologies ||
    previous.term !== next.term ||
    previous.className !== next.className ||
    previous.hoverCentre !== next.hoverCentre
  ) {
    return false;
  }
  // Re-render only when a CHIP axis moved — never for text.
  return (
    previous.filter.abstractions === next.filter.abstractions &&
    previous.filter.namespaces === next.filter.namespaces
  );
});

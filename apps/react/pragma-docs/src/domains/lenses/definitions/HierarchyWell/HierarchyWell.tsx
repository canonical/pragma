import { Link } from "@canonical/router-react";
import { type NodeProps, ReactFlow } from "@xyflow/react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
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
 * Hover/focus state is CLIENT-ONLY and starts empty, so the first client
 * render reproduces the server's selection-only markup byte for byte —
 * see `decorateGraph.ts` for the argument and the test that pins it.
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
}: HierarchyWellProps): React.ReactElement => {
  const data = useFragment<HierarchyWell_ontologies$key>(
    hierarchyWellFragmentNode,
    ontologies,
  );
  const graph = useMemo(() => buildClassTree(data), [data]);

  // The transient ego centre: hover or keyboard focus, whichever spoke
  // last. Client-only, and `undefined` on first paint by construction.
  const [focused, setFocused] = useState<string | undefined>(undefined);

  const { nodes, edges } = useMemo(
    () => decorateForView(graph, { selected: term, focused, filter }),
    [graph, term, focused, filter],
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
          setFocused(undefined);
        }}
        onFocus={(event) => {
          setFocused(readTermFromEvent(event.target));
        }}
        onNodeMouseEnter={(_event, node) => {
          setFocused(node.id);
        }}
        onNodeMouseLeave={() => {
          setFocused(undefined);
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

export default HierarchyWell;

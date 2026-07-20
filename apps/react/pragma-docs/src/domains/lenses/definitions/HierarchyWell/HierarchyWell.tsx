import { Link } from "@canonical/router-react";
import { type NodeProps, ReactFlow } from "@xyflow/react";
import type React from "react";
import { useMemo } from "react";
import { graphql, useFragment } from "react-relay";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import hierarchyWellFragmentNode from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import { buildClassTree } from "./buildClassTree.js";
import type { HierarchyWellProps, TermFlowNode } from "./types.js";
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
 */
const TermNode = ({ data }: NodeProps<TermFlowNode>): React.ReactElement => (
  <Link
    className={[
      "hierarchy-node",
      data.isAbstract ? "hierarchy-node-abstract" : "",
    ]
      .filter(Boolean)
      .join(" ")}
    params={{ term: data.term }}
    to="definitionsTerm"
  >
    {data.label}
  </Link>
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
  ontologies,
  term,
}: HierarchyWellProps): React.ReactElement => {
  const data = useFragment<HierarchyWell_ontologies$key>(
    hierarchyWellFragmentNode,
    ontologies,
  );
  const { nodes, edges } = useMemo(() => buildClassTree(data), [data]);
  const displayNodes = useMemo(
    () =>
      nodes.map((node) =>
        node.id === term ? { ...node, className: "is-selected" } : node,
      ),
    [nodes, term],
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
        nodes={displayNodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
      />
    </div>
  );
};

export default HierarchyWell;

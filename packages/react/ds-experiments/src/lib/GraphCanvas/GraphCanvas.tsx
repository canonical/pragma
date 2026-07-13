import { Background, Controls, Panel, ReactFlow } from "@xyflow/react";
import { type ReactElement, useMemo } from "react";
import buildGraphElements from "../../helpers/buildGraphElements.js";
import EntityNode from "../EntityNode/EntityNode.js";
import GraphLegend from "../GraphLegend/GraphLegend.js";
import RelationEdge from "../RelationEdge/RelationEdge.js";
import SubclassEdge from "../SubclassEdge/SubclassEdge.js";
import type { GraphCanvasProps } from "./types.js";
import "@xyflow/react/dist/style.css";
import "./styles.css";

const componentCssClassName = "ds graph-canvas";

// Registered outside the component so React Flow sees stable identities and
// does not warn about (or re-mount from) new type maps on every render.
const nodeTypes = { entity: EntityNode };
const edgeTypes = { relation: RelationEdge, subclass: SubclassEdge };

/**
 * The composition root for the ontology graph — a pure, presentational canvas.
 * Give it a slice of the knowledge graph (plain `entities` and `relations`) and
 * it draws it: entities become `EntityNode`s, relations become `RelationEdge`s
 * or `SubclassEdge`s, and it layers a legend, controls, and background on top.
 *
 * It fetches nothing. The Relay projection `OntologyGraph` binds a query and
 * hands its result straight here — the seam that keeps the human canvas and the
 * agent-facing query one and the same.
 *
 * The two arrowhead markers the edges reference (`#ds-relation-arrow`, the
 * filled associative arrow, and `#ds-subclass-arrow`, the hollow taxonomic one)
 * are defined once here so every edge shares them.
 *
 * @implements ds:experiments.component.graph-canvas
 */
const GraphCanvas = ({
  entities,
  relations,
  positions,
  height = 480,
  showLegend = true,
  showControls = true,
  showBackground = true,
  fitView = true,
  className,
  ...props
}: GraphCanvasProps): ReactElement => {
  const { nodes, edges } = useMemo(
    () =>
      buildGraphElements(entities, relations, {
        positions: positions ? new Map(Object.entries(positions)) : undefined,
      }),
    [entities, relations, positions],
  );

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      style={{ blockSize: height }}
      {...props}
    >
      {/* Document-scoped arrowhead markers the edges resolve by id. */}
      <svg className="ds graph-markers" aria-hidden="true">
        <title>Graph edge markers</title>
        <defs>
          <marker
            id="ds-relation-arrow"
            markerWidth={12}
            markerHeight={12}
            refX={9}
            refY={5}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path className="ds relation-arrow" d="M0,0 L9,5 L0,10 z" />
          </marker>
          <marker
            id="ds-subclass-arrow"
            markerWidth={18}
            markerHeight={18}
            refX={14}
            refY={7}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path className="ds subclass-arrow" d="M0,0 L14,7 L0,14 z" />
          </marker>
        </defs>
      </svg>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={fitView}
        nodesDraggable
        elementsSelectable
        minZoom={0.2}
      >
        {showBackground ? <Background /> : null}
        {showControls ? <Controls /> : null}
        {showLegend ? (
          <Panel position="top-right">
            <GraphLegend />
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  );
};

export default GraphCanvas;

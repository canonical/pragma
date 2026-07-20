import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type React from "react";
import type { RelationEdgeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds relation-edge";

/**
 * The renderer React Flow uses for an *associative* relation — `uses`,
 * `governs`, `refines`. It draws a curved edge tinted by the relation kind (the
 * `modifier` in its data), ends it with the shared filled arrowhead marker that
 * `GraphCanvas` defines, and floats the relation's verb at the midpoint.
 *
 * Register it with `GraphCanvas`'s `edgeTypes` under the key `"relation"`; the
 * taxonomic `SUBCLASS_OF` relation is drawn by `SubclassEdge` instead.
 *
 * @implements ds:experiments.component.relation-edge
 */
const RelationEdge = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  data,
  label,
}: RelationEdgeProps): React.ReactElement => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const className = [componentCssClassName, data?.modifier]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd="url(#ds-relation-arrow)"
        className={className}
      />
      {label ? (
        <EdgeLabelRenderer>
          <span
            className="ds relation-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export default RelationEdge;

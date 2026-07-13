import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";
import type React from "react";
import type { SubclassEdgeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds subclass-edge";

/**
 * The renderer React Flow uses for the *taxonomic* `SUBCLASS_OF` relation — the
 * ontological "is a". It is deliberately distinct from the associative
 * `RelationEdge`: an orthogonal smooth-step path and the hollow-triangle marker
 * `GraphCanvas` defines, borrowing the UML generalisation arrow so a reader can
 * tell "Button is a Component" apart from "Button uses color-accent" at a glance.
 *
 * Register it with `GraphCanvas`'s `edgeTypes` under the key `"subclass"`.
 *
 * @implements ds:experiments.component.subclass-edge
 */
const SubclassEdge = ({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  label,
}: SubclassEdgeProps): React.ReactElement => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd="url(#ds-subclass-arrow)"
        className={componentCssClassName}
      />
      {label ? (
        <EdgeLabelRenderer>
          <span
            className="ds subclass-edge-label"
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

export default SubclassEdge;

import { Handle, Position } from "@xyflow/react";
import type React from "react";
import resolveEntityAppearance from "../../helpers/resolveEntityAppearance.js";
import type { EntityNodeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds entity-node";

/**
 * The renderer React Flow uses to draw an ontology entity — a card showing the
 * entity's category, label, tier, and summary. It is a *pure* presentational
 * node: everything it needs arrives in `data.entity`, and its accent colour
 * comes from `resolveEntityAppearance` — the same resolver `GraphLegend` reads,
 * so canvas and legend can never disagree.
 *
 * Register it with `GraphCanvas`'s `nodeTypes` under the key `"entity"`; the
 * left and right handles are the anchor points relations attach to.
 *
 * @implements ds:experiments.component.entity-node
 */
const EntityNode = ({
  data,
  selected,
}: EntityNodeProps): React.ReactElement => {
  const { entity } = data;
  const appearance = resolveEntityAppearance(entity.kind);

  return (
    <div
      className={[
        componentCssClassName,
        appearance.modifier,
        selected ? "is-selected" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--entity-accent": `var(${appearance.accentVar})`,
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Left} />
      <header className="entity-node-header">
        <span className="entity-node-kind">{appearance.label}</span>
        {entity.tier ? (
          <span className="entity-node-tier">{entity.tier.toLowerCase()}</span>
        ) : null}
      </header>
      <p className="entity-node-label">{entity.label}</p>
      {entity.summary ? (
        <p className="entity-node-summary">{entity.summary}</p>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default EntityNode;

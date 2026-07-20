import type React from "react";
import type { EntityKind, RelationKind } from "../../graph/types.js";
import resolveEntityAppearance from "../../helpers/resolveEntityAppearance.js";
import resolveRelationAppearance from "../../helpers/resolveRelationAppearance.js";
import type { GraphLegendProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds graph-legend";

const DEFAULT_ENTITY_KINDS: EntityKind[] = [
  "COMPONENT",
  "TOKEN",
  "STANDARD",
  "CONCEPT",
];

const DEFAULT_RELATION_KINDS: RelationKind[] = [
  "SUBCLASS_OF",
  "USES",
  "GOVERNS",
  "REFINES",
];

/**
 * The key to the canvas: it names each entity category and relation kind and
 * shows the colour used to draw it. Both columns read from the same
 * `resolveEntityAppearance` / `resolveRelationAppearance` resolvers the nodes
 * and edges use, so the legend is guaranteed to match what is on the canvas.
 *
 * It is a pure presentational component — no React Flow, no data fetching — so
 * it renders anywhere, including as a `Panel` inside `GraphCanvas`.
 *
 * @implements ds:experiments.component.graph-legend
 */
const GraphLegend = ({
  entityKinds = DEFAULT_ENTITY_KINDS,
  relationKinds = DEFAULT_RELATION_KINDS,
  heading = "Legend",
  className,
  ...props
}: GraphLegendProps): React.ReactElement => {
  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      {heading != null ? (
        <p className="graph-legend-heading">{heading}</p>
      ) : null}

      <div className="graph-legend-group">
        <p className="graph-legend-group-title">Entities</p>
        <ul className="graph-legend-items">
          {entityKinds.map((kind) => {
            const appearance = resolveEntityAppearance(kind);
            return (
              <li key={kind} className="graph-legend-item">
                <span
                  className="graph-legend-swatch graph-legend-swatch-entity"
                  style={{ backgroundColor: `var(${appearance.accentVar})` }}
                />
                <span className="graph-legend-label">{appearance.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="graph-legend-group">
        <p className="graph-legend-group-title">Relations</p>
        <ul className="graph-legend-items">
          {relationKinds.map((kind) => {
            const appearance = resolveRelationAppearance(kind);
            return (
              <li key={kind} className="graph-legend-item">
                <span
                  className="graph-legend-swatch graph-legend-swatch-relation"
                  style={{ backgroundColor: `var(${appearance.accentVar})` }}
                />
                <span className="graph-legend-label">{appearance.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default GraphLegend;

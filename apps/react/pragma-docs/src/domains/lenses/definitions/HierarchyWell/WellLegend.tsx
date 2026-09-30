import type React from "react";
import { ABSTRACTION_VALUES } from "../lensFilter.js";

/**
 * The well's legend — canvas-local furniture, bottom-left, exactly where
 * the exhibit puts it. It exists because the graph encodes things
 * VISUALLY (a dashed italic node is abstract; an arrow runs subclass →
 * superclass) and an encoding nobody can read is decoration.
 *
 * Deliberately small and static: it explains the two encodings the well
 * actually uses and nothing else. The chip toolbar in the mode strip
 * carries the namespace axis, which is named there in words, so repeating
 * it here would be noise rather than help.
 *
 * Static content means no client state, so it server-renders with the rest
 * of the well and takes no part in the hydration argument.
 */
const WellLegend = (): React.ReactElement => (
  <dl
    aria-label="Graph legend"
    className="hierarchy-furniture hierarchy-legend"
  >
    {ABSTRACTION_VALUES.map((value) => (
      <div className="hierarchy-legend-row" key={value}>
        <dt>
          <span
            aria-hidden="true"
            className={`hierarchy-legend-swatch hierarchy-legend-swatch-${value}`}
          />
        </dt>
        <dd>
          {value === "abstract"
            ? "abstract class — not instantiated directly"
            : "concrete class"}
        </dd>
      </div>
    ))}
    <div className="hierarchy-legend-row">
      <dt>
        <span aria-hidden="true" className="hierarchy-legend-edge" />
      </dt>
      <dd>points to its superclass</dd>
    </div>
    <div className="hierarchy-legend-row">
      <dt>
        <span
          aria-hidden="true"
          className="hierarchy-legend-edge hierarchy-legend-edge-relation"
        />
      </dt>
      <dd>relation — hover a class to see its named arcs</dd>
    </div>
  </dl>
);

export default WellLegend;

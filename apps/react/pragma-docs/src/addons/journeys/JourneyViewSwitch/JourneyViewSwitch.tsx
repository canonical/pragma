import type React from "react";
import type { JourneyView } from "../JourneysExplorer/types.js";
import "./styles.css";

const componentCssClassName = "ds journeys-view-switch";

/** The two readings the switch offers, in render order. Data-independent
 * labels — a stable string, so the strip content never drifts with the graph. */
const VIEW_OPTIONS: readonly {
  readonly key: JourneyView;
  readonly label: string;
}[] = [
  { key: "table", label: "Table" },
  { key: "graph", label: "Graph" },
];

export interface JourneyViewSwitchProps {
  /** Additional CSS class names. */
  className?: string;
  /** The current reading — the pressed toggle. */
  readonly view: JourneyView;
  /** Called with the next reading when a toggle is pressed. */
  readonly onViewChange: (next: JourneyView) => void;
}

/**
 * The Table ⇄ Graph switch (RULING 1) — now the mode strip's `controls`
 * tenant (`slot.journeys-view`), claimed by the Journeys routes, exactly as
 * the Definitions chips fill the same socket.
 *
 * A labelled `fieldset` of `aria-pressed` toggles — the exact idiom the
 * table's own group control and the rail's persona chips use, so the choice
 * is announced as a named group and each option stays visible without colour
 * alone (weight + fill). Pure — it renders `view` and calls `onViewChange`,
 * holding no state of its own (the ephemeral view lives in
 * `journeyViewContext`, above the frame boundary this component sits on).
 */
const JourneyViewSwitch = ({
  className,
  view,
  onViewChange,
}: JourneyViewSwitchProps): React.ReactElement => (
  <fieldset
    aria-label="Journey view"
    className={[componentCssClassName, className].filter(Boolean).join(" ")}
    data-slot="journeys-view"
  >
    {VIEW_OPTIONS.map((option) => (
      <button
        aria-pressed={view === option.key}
        className="journeys-view-switch-option"
        key={option.key}
        onClick={() => {
          onViewChange(option.key);
        }}
        type="button"
      >
        {option.label}
      </button>
    ))}
  </fieldset>
);

export default JourneyViewSwitch;

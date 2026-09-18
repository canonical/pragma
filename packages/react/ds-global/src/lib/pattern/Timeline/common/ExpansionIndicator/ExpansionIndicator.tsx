import type React from "react";
import type { ExpansionIndicatorProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds timeline-expansion";

/**
 * Timeline.ExpansionIndicator subcomponent — the summary of hidden events
 * with links to reveal more or all of them. The connector line passes
 * through the 12px rails above and below the bordered summary strip.
 *
 * @implements ds:global.subcomponent.timeline-expansion-indicator
 */
const ExpansionIndicator = ({
  hiddenCount,
  step,
  onShowMore,
  onShowAll,
  className,
  ...props
}: ExpansionIndicatorProps): React.ReactElement => {
  const summary =
    hiddenCount === undefined ? null : (
      <span className="summary">{hiddenCount} hidden</span>
    );
  // The label never promises more than the number still hidden.
  const moreCount =
    step !== undefined && step > 0 ? Math.min(step, hiddenCount ?? step) : 0;
  const moreLabel = moreCount > 0 ? `Show ${moreCount} more` : "Show more";
  const more = onShowMore ? (
    <button type="button" className="link" onClick={onShowMore}>
      {moreLabel}
    </button>
  ) : null;
  const all = onShowAll ? (
    <button type="button" className="link" onClick={onShowAll}>
      Show all
    </button>
  ) : null;

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="wrapper">
        {summary}
        {summary && (more || all) ? (
          <span className="separator" aria-hidden="true">
            •
          </span>
        ) : null}
        {more}
        {more && all ? (
          <span className="separator" aria-hidden="true">
            •
          </span>
        ) : null}
        {all}
      </div>
    </div>
  );
};

ExpansionIndicator.displayName = "Timeline.ExpansionIndicator";

export default ExpansionIndicator;
